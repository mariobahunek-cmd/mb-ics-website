import { authorize } from "./admin.ts";
import { exportOwner } from "./operations.ts";
import { withdraw } from "./lifecycle.ts";
import type { Context } from "./context.ts";
import type { Actor } from "./admin.ts";
import {
  adminList,
  moderate,
  auditList,
  redact,
  withdrawHistorical,
  publishHistorical,
  rejectHistorical,
  historicalAdminList,
} from "./admin.ts";
import { submit, limit } from "./submit.ts";
import { confirm } from "./confirm.ts";
import { publicList, summary, historicalList, homepageIdentities } from "./public.ts";
import { HttpError } from "./schema.ts";
export interface AppOptions {
  mc?: {handle:(req:Request)=>Promise<Response>};
  origins: string[];
  browserAuth?: { handle: (req: Request) => Promise<Response | null> };
  authenticate: (req: Request) => Promise<Actor | null>;
  sitekey?: string;
  local?: boolean;
  closed?: boolean;
  historicalReleaseReference?: string | null;
}
export function createApp(ctx: Context, options: AppOptions) {
  // Cache exists only inside the service; SQLite's change counters invalidate it before every read.
  const cache = new Map<string, unknown>();
  let revision = "";
  function cached(key: string, read: () => unknown) {
    const next = JSON.stringify([
      ctx.db.prepare("SELECT total_changes() n").get(),
      ctx.db.prepare("PRAGMA data_version").get(),
    ]);
    if (next !== revision) {
      cache.clear();
      revision = next;
    }
    if (!cache.has(key)) {
      if (cache.size >= 100) cache.clear();
      cache.set(key, read());
    }
    return cache.get(key);
  }
  return async function app(req: Request, ip = "unknown"): Promise<Response> {
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      Vary: "Origin",
    });
    const respond = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    try {
      if(new URL(req.url).pathname.startsWith('/v1/mc/')){
        if(!options.mc)throw new HttpError(404,'not_found');
        return options.mc.handle(req);
      }
      const authResponse = await options.browserAuth?.handle(req);
      if (authResponse) return authResponse;
      const url = new URL(req.url),
        origin = req.headers.get("origin");
      if (origin && !options.origins.includes(origin))
        throw new HttpError(403, "origin");
      if (origin) headers.set("Access-Control-Allow-Origin", origin);
      if (req.method === "OPTIONS") {
        headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        headers.set(
          "Access-Control-Allow-Headers",
          "Content-Type, Idempotency-Key, Authorization",
        );
        return new Response(null, { status: 204, headers });
      }
      if (!["GET", "POST"].includes(req.method))
        throw new HttpError(405, "method");
      if (
        req.method === "POST" &&
        (!origin || !options.origins.includes(origin))
      )
        throw new HttpError(403, "origin");
      let body: Record<string, unknown> = {};
      if (req.method === "POST") {
        if (
          !req.headers
            .get("content-type")
            ?.toLowerCase()
            .startsWith("application/json")
        )
          throw new HttpError(415, "content_type");
        const raw = await req.text();
        if (Buffer.byteLength(raw) > 16384)
          throw new HttpError(413, "request_size");
        try {
          body = JSON.parse(raw);
          if (!body || typeof body !== "object" || Array.isArray(body)) throw 0;
        } catch {
          throw new HttpError(400, "json");
        }
      }
      if (url.pathname === "/v1/config" && req.method === "GET")
        return respond({
          local: !!options.local,
          sitekey: options.sitekey ?? "",
          closed: !!options.closed,
        });
      if (url.pathname === "/v1/reviews" && req.method === "POST") {
        if (options.closed) throw new HttpError(503, "submissions_closed");
        return respond(
          await submit(ctx, body, req.headers.get("idempotency-key") ?? "", ip),
          202,
        );
      }
      if (url.pathname === "/v1/reviews/confirm" && req.method === "POST") {
        limit(ctx, "confirm", ip, 60, 3600000);
        return respond(confirm(ctx, body.token));
      }
      if (url.pathname === "/v1/reviews/withdraw" && req.method === "POST") {
        limit(ctx, "withdraw", ip, 60, 3600000);
        return respond(withdraw(ctx, body.token));
      }
      if (url.pathname === "/v1/reviews" && req.method === "GET")
        return respond(
          cached(url.pathname + url.search, () =>
            publicList(ctx, url.searchParams),
          ),
        );
      if (url.pathname === "/v1/reviews/summary" && req.method === "GET")
        return respond(cached("summary", () => summary(ctx)));
      if (url.pathname === "/v1/historical/identities" && req.method === "GET")
        return respond(cached("homepage-identities", () => homepageIdentities(ctx)));
      if (url.pathname === "/v1/historical" && req.method === "GET")
        return respond(
          cached(url.pathname + url.search, () =>
            historicalList(ctx, url.searchParams),
          ),
        );
      if (url.pathname.startsWith("/v1/admin/")) {
        const actor = await options.authenticate(req);
        authorize(actor);
        if (url.pathname === "/v1/admin/export" && req.method === "GET")
          return respond(exportOwner(ctx, actor));
        if (url.pathname === "/v1/admin/reviews" && req.method === "GET")
          return respond(
            adminList(ctx, actor, Number(url.searchParams.get("offset") ?? 0)),
          );
        if (url.pathname === "/v1/admin/audit" && req.method === "GET")
          return respond(
            auditList(ctx, actor, Number(url.searchParams.get("offset") ?? 0)),
          );
        if (url.pathname === "/v1/admin/historical" && req.method === "GET")
          return respond(historicalAdminList(ctx,actor,Number(url.searchParams.get("offset") ?? 0)));
        const rejection = /^\/v1\/admin\/historical\/(.+)\/reject$/.exec(url.pathname);
        if (rejection && req.method === "POST")
          return respond(rejectHistorical(ctx,actor,decodeURIComponent(rejection[1]),body));
        const approval = /^\/v1\/admin\/historical\/(.+)\/approve$/.exec(url.pathname);
        if (approval && req.method === "POST") {
          if (options.closed) throw new HttpError(423, "historical_release_hold");
          const result = publishHistorical(ctx, actor, decodeURIComponent(approval[1]), body, options.historicalReleaseReference ?? null);
          return respond(result);
        }
        const historical = /^\/v1\/admin\/historical\/(.+)$/.exec(url.pathname);
        if (historical && req.method === "POST")
          return respond(
            withdrawHistorical(ctx, actor, decodeURIComponent(historical[1])),
          );
        const redaction =
          /^\/v1\/admin\/reviews\/([a-f0-9-]{36})\/redact$/.exec(url.pathname);
        if (redaction && req.method === "POST")
          return respond(redact(ctx, actor, redaction[1], body.remove));
        const match = /^\/v1\/admin\/reviews\/([a-f0-9-]{36})$/.exec(
          url.pathname,
        );
        if (match && req.method === "POST")
          return respond(
            moderate(
              ctx,
              actor,
              match[1],
              String(body.status ?? ""),
              String(body.reason ?? ""),
            ),
          );
      }
      throw new HttpError(404, "not_found");
    } catch (e) {
      return respond(
        { error: e instanceof HttpError ? e.message : "service_unavailable" },
        e instanceof HttpError ? e.status : 503,
      );
    }
  };
}
