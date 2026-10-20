import { probeBackup } from "./backup-operations.ts";
import { HttpError } from "./schema.ts";
import { contentSecurityPolicy } from "./csp.ts";
import { clientAddress } from "./ingress.ts";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, stat, realpath } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { scheduleOffhost } from "./offhost.ts";
import { recoveryBinding, boundRecoveryCycle } from "./offhost-binding.ts";
import { loadConfig } from "./config.ts";
import { openDB } from "./db.ts";
import { createApp } from "./index.ts";
import { identityVerifier } from "./auth.ts";
import { createMCBridge, mcConfiguration } from './mc-bridge.ts';
import { discoverBrowserAuth } from "./browser-auth.ts";
import { sendSharedMail } from "./mail-provider.ts";
import { retryMail } from "./mail.ts";
import { cleanup } from "./lifecycle.ts";
import type { Context, Mail } from "./context.ts";
const config = loadConfig(process.env),
  offhostConfig = recoveryBinding(process.env),
  root = fileURLToPath(new URL("../../../", import.meta.url));
const data = resolve(config.data);
await mkdir(data, { recursive: true, mode: 0o700 });
let key: Buffer;
if (config.local) {
  const keyfile = resolve(data, "local-key");
  try {
    key = await readFile(keyfile);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    key = randomBytes(32);
    await writeFile(keyfile, key, { mode: 0o600, flag: "wx" });
  }
} else key = Buffer.from(process.env.REVIEWS_KEY!, "base64");
if (key.length !== 32) throw new Error("Invalid private key file");
try {
  await stat(resolve(data, "reviews.sqlite.restore-pending"));
  throw new Error("Restored database requires withdrawal reconciliation");
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
const db = openDB(resolve(data, "reviews.sqlite"));
const localSession = randomBytes(32).toString("base64url");
const spool = resolve(data, "mail");
if (config.local) await mkdir(spool, { recursive: true, mode: 0o700 });
const ctx: Context = {
  db,
  key,
  now: Date.now,
  site: config.site,
  mailEnabled: config.mailEnabled,
  backupAdmission: config.local ? undefined : () => {
    try {
      if (offhostConfig && probeBackup(data).admitted) return;
    } catch { /* missing/unwritable alarm evidence never opens admission */ }
    throw new HttpError(503, "backup_unavailable");
  },
  send: async (mail: Mail, id: string, dispatch) => {
    if (config.local) {
      if (!mail.to.endsWith(".invalid"))
        throw new Error("Local mail accepts only .invalid synthetic addresses");
      try {
        await writeFile(
          resolve(spool, id + ".json"),
          JSON.stringify({
            ...mail,
            adapter: "LOCAL ONLY — no mail delivered",
          }),
          { mode: 0o600, flag: "wx" },
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      }
      return;
    }
    await sendSharedMail(config.sharedPool, mail, id, undefined, dispatch);
  },
  challenge: async (token: string) => {
    if (config.local) return token === "local-synthetic";
    if (!token || token.length > 2048) return false;
    try {
      const r = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: new URLSearchParams({
            secret: process.env.TURNSTILE_SECRET!,
            response: token,
          }),
          signal: AbortSignal.timeout(5000),
          redirect: "error",
        },
      );
      const body = (await r.json()) as {
        success: boolean;
        hostname: string;
        action: string;
      };
      return (
        r.ok &&
        body.success === true &&
        body.hostname === process.env.TURNSTILE_HOSTNAME &&
        body.action === "review"
      );
    } catch {
      return false;
    }
  },
};
const productionAuth = config.local
  ? null
  : identityVerifier(
      {
        issuer: process.env.OIDC_ISSUER!,
        audience: process.env.OIDC_AUDIENCE!,
        browserClientId: process.env.OIDC_CLIENT_ID!,
        subjects: process.env.OIDC_SUBJECTS!.split(","),
        mfaMethods: process.env.OIDC_MFA_METHODS!.split(","),
        now: () => Math.floor(Date.now() / 1000),
      },
      process.env.OIDC_JWKS_URL!,
    );
let browserAuth: Awaited<ReturnType<typeof discoverBrowserAuth>>|undefined;
const mcBinding = config.local ? undefined : mcConfiguration(process.env, config.api);
const mcBridge = mcBinding ? createMCBridge(ctx, {...mcBinding,isActive:(sub,session)=>!!browserAuth?.isSessionActive(sub,session)}) : undefined;
browserAuth = config.local
  ? undefined
  : await discoverBrowserAuth(process.env, undefined, mcBridge);
const authenticate = async (req: Request) => {
  if (
    browserAuth &&
    (req.headers.get("cookie") ?? "").includes("__Host-review-session=")
  )
    return browserAuth.authenticate(req);
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) return null;
  if (config.local)
    return bearer === localSession
      ? { sub: "LOCAL-SYNTHETIC-MODERATOR", role: "moderator" as const }
      : null;
  return productionAuth!(bearer);
};
const app = createApp(ctx, {
  origins: [config.site, config.api],
  browserAuth,
  mc: mcBridge,
  authenticate,
  sitekey: config.local ? "" : process.env.TURNSTILE_SITEKEY,
  local: config.local,
  closed: config.closed,
  historicalReleaseReference: config.historicalReleaseReference,
});
const staticRoot = resolve(
  process.env.REVIEWS_STATIC_DIR ?? resolve(root, "_site"),
);
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", contentSecurityPolicy(config.api));
  try {
    if (req.headers.host !== new URL(config.api).host) {
      res.writeHead(403).end();
      return;
    }
    const url = new URL(req.url ?? "/", config.api);
    if (
      url.pathname.startsWith("/v1/") ||
      url.pathname.startsWith("/__local/")
    ) {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > 16384) {
          res
            .writeHead(413, { "Content-Type": "application/json" })
            .end('{"error":"request_size"}');
          return;
        }
        chunks.push(c);
      }
      const request = new Request(url, {
        method: req.method,
        headers: new Headers(
          Object.entries(req.headers).flatMap(([k, v]) =>
            v === undefined
              ? []
              : [[k, Array.isArray(v) ? v.join(",") : v] as [string, string]],
          ),
        ),
        ...(["GET", "HEAD"].includes(req.method ?? "GET")
          ? {}
          : { body: Buffer.concat(chunks) }),
      });
      if (url.pathname.startsWith("/__local/")) {
        if (!config.local) {
          res.writeHead(404).end();
          return;
        }
        res.setHeader("Content-Type", "application/json");
        if (
          url.pathname === "/__local/login" &&
          req.method === "POST" &&
          req.headers.origin === config.site &&
          req.headers["content-type"] === "application/json"
        ) {
          res.end(
            JSON.stringify({
              token: localSession,
              identity: "LOCAL SYNTHETIC — not production MFA",
            }),
          );
          return;
        }
        if (
          url.pathname === "/__local/mail" &&
          req.method === "GET" &&
          (await authenticate(request))
        ) {
          const { readdir } = await import("node:fs/promises");
          const files = await readdir(spool);
          const messages = await Promise.all(
            files
              .filter((n) => /^[a-f0-9-]+\.json$/.test(n))
              .map(async (n) =>
                JSON.parse(await readFile(resolve(spool, n), "utf8")),
              ),
          );
          res.end(JSON.stringify(messages));
          return;
        }
        res.writeHead(401).end('{"error":"unauthorized"}');
        return;
      }
      const response = await app(
        request,
        clientAddress(
          req.socket.remoteAddress ?? "unknown",
          typeof req.headers["x-real-ip"] === "string"
            ? req.headers["x-real-ip"]
            : undefined,
          config.local ? undefined : process.env.REVIEWS_TRUSTED_PROXY,
        ),
      );
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader("Set-Cookie", cookies);
      res.writeHead(
        response.status,
        Object.fromEntries(
          [...response.headers].filter(([key]) => key !== "set-cookie"),
        ),
      );
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405).end();
      return;
    }
    let path: string;
    if (url.pathname === "/admin/" || url.pathname === "/admin/admin.js")
      path = resolve(
        root,
        "services/reviews/admin",
        url.pathname.endsWith(".js") ? "admin.js" : "index.html",
      );
    else {
      let requested = decodeURIComponent(url.pathname);
      if (requested.endsWith("/")) requested += "index.html";
      path = resolve(staticRoot, "." + requested);
      const resolved = await realpath(path);
      if (!resolved.startsWith((await realpath(staticRoot)) + sep)) {
        res.writeHead(404).end();
        return;
      }
    }
    if (!(await stat(path)).isFile()) {
      res.writeHead(404).end();
      return;
    }
    const mime: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".svg": "image/svg+xml",
      ".json": "application/json",
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    res.setHeader(
      "Content-Type",
      mime[extname(path)] ?? "application/octet-stream",
    );
    let body = await readFile(path);
    if (url.pathname === "/admin/") {
      const publicReviewsUrl = (config.site + "/reviews/").replace(
        /[&<>"']/g,
        (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
      );
      body = Buffer.from(body.toString("utf8").replace("__REVIEWS_PUBLIC_URL__", publicReviewsUrl));
    }
    if (extname(path) === ".html")
      res.setHeader(
        "Content-Security-Policy",
        contentSecurityPolicy(
          config.api,
          config.local,
          url.pathname,
          body.toString("utf8"),
        ),
      );
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    if (!res.headersSent)
      res.writeHead(404, { "Content-Type": "application/json" });
    res.end('{"error":"not_found"}');
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
cleanup(ctx);
const timer = setInterval(() => {
  cleanup(ctx);
  void retryMail(ctx);
}, 60000);
timer.unref();
const recoveryWorker = offhostConfig ? scheduleOffhost(
  boundRecoveryCycle(db, offhostConfig, data),
  () => console.error("Offhost recovery cycle failed; do not infer backup/freshness acceptance. Inspect private schedule state; no provider/private error contents logged."),
) : null;
if (!config.local && !offhostConfig) console.error("Offhost recovery NOT CONFIGURED; live recovery acceptance remains blocked.");
server.listen(config.port, config.host, () =>
  console.log(
    `Reviews ${config.local ? "LOCAL SYNTHETIC preview" : "production service"} listening on ${config.host}:${config.port}; ${config.local ? "no outbound mail, local identity only" : config.mailEnabled ? "MFA configured; shared-pool mail enabled, no reserved capacity or delivery guarantee; backup admission still required" : "MFA configured; MAIL PAUSED: explicit shared-pool opt-in required"}`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    clearInterval(timer);
    server.close(async () => {
      await recoveryWorker?.stop();
      db.close();
      process.exit(0);
    });
  });

server.on("error", async () => {
  console.error(
    "Review listener unavailable; check bind permission and port. No private request data logged.",
  );
  clearInterval(timer);
  await recoveryWorker?.stop();
  db.close();
  process.exitCode = 1;
});
