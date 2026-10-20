import * as oidc from "openid-client";
import { randomBytes, createHash } from "node:crypto";
import { HttpError } from "./schema.ts";
import type { Actor } from "./admin.ts";
import type { createMCBridge, MCHandoff } from './mc-bridge.ts';

export interface BrowserIdentity {
  config: oidc.Configuration;
  issuer: string;
  jwksUrl: string;
  origin: string;
  redirect: string;
  subjects: string[];
  mfaMethods: string[];
  now?: () => number;
  mc?: Pick<ReturnType<typeof createMCBridge>,'begin'|'complete'>;
}
const random = () => randomBytes(32).toString("base64url");
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const txCookie = "__Host-review-oidc";
const sessionCookie = "__Host-review-session";
function cookie(req: Request, name: string) {
  const entries = (req.headers.get("cookie") ?? "")
    .split(";")
    .map((x) => x.trim())
    .filter((x) => x.startsWith(name + "="));
  return entries.length === 1 &&
    /^[A-Za-z0-9_-]{43}$/.test(entries[0].slice(name.length + 1))
    ? entries[0].slice(name.length + 1)
    : "";
}
function setCookie(name: string, value: string, age: number, sameSite: string) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${age}`;
}
export function createBrowserAuth(options: BrowserIdentity) {
  if (
    new URL(options.origin).origin !== options.origin ||
    !options.origin.startsWith("https://") ||
    options.redirect !== options.origin + "/v1/admin/callback"
  )
    throw new Error("Exact HTTPS admin origin and callback required");
  const metadata = options.config.serverMetadata();
  if (
    metadata.issuer !== options.issuer ||
    metadata.jwks_uri !== options.jwksUrl
  )
    throw new Error("Exact configured issuer/JWKS binding required");
  for (const key of [
    "issuer",
    "authorization_endpoint",
    "token_endpoint",
    "jwks_uri",
  ] as const) {
    const value = metadata[key];
    if (
      typeof value !== "string" ||
      new URL(value).protocol !== "https:" ||
      new URL(value).username ||
      new URL(value).password ||
      new URL(value).hash
    )
      throw new Error("Exact HTTPS OIDC endpoints required");
  }
  if (options.config.clientMetadata().id_token_signed_response_alg !== "RS256")
    throw new Error("RS256 required");
  oidc.enableNonRepudiationChecks(options.config);
  const now = options.now ?? (() => Math.floor(Date.now() / 1000));
  // Families are shared objects owned only by bounded, expiring attempts/sessions.
  // No global/subject tombstones and no cross-browser anonymous revocation.
  type Family = { generation: number };
  const transactions = new Map<
    string,
    {
      state: string;
      nonce: string;
      verifier: string;
      started: number;
      expires: number;
      consumed: boolean;
      family: Family;
      generation: number;
      mc?: MCHandoff;
    }
  >();
  const sessions = new Map<
    string,
    { actor: Actor; csrf: string; expires: number; family: Family }
  >();
  function prune() {
    for (const [key, value] of transactions)
      if (value.expires <= now()) transactions.delete(key);
    for (const [key, value] of sessions)
      if (value.expires <= now()) sessions.delete(key);
  }
  function revoke(family: Family) {
    family.generation++;
    for (const [key, value] of sessions)
      if (value.family === family) sessions.delete(key);
  }
  const response = (
    body: unknown,
    status = 200,
    extra: Record<string, string> = {},
  ) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        ...extra,
      },
    });
  return {
    async handle(req: Request): Promise<Response | null> {
      prune();
      const url = new URL(req.url);
      if (!url.pathname.startsWith("/v1/admin/")) return null;
      try {
        if (
          (req.headers.has("host") &&
            req.headers.get("host") !== new URL(options.origin).host) ||
          url.origin !== options.origin ||
          (req.headers.has("origin") &&
            req.headers.get("origin") !== options.origin)
        )
          throw new HttpError(403, "origin");
        const mcStart=url.pathname==='/v1/admin/mc-login';
        if (url.pathname === "/v1/admin/login" || mcStart) {
          let mc: MCHandoff|undefined;
          if(mcStart){
            if(req.method!=='GET' || !options.mc)throw new HttpError(404,'not_found');
            if(url.searchParams.getAll('ticket').length!==1)throw new HttpError(401,'handoff');
            mc=options.mc.begin(url.searchParams.get('ticket')||'');
          }else{
          if (req.method !== "POST") throw new HttpError(405, "method");
          if (
            req.headers.get("origin") !== options.origin ||
            ["cross-site", "same-site"].includes(
              req.headers.get("sec-fetch-site") ?? "",
            )
          )
            throw new HttpError(403, "origin");
          if (
            !["application/json", "application/x-www-form-urlencoded"].includes(
              req.headers.get("content-type")?.split(";")[0] ?? "",
            )
          )
            throw new HttpError(415, "content_type");
          if (Buffer.byteLength(await req.text()) > 16384)
            throw new HttpError(413, "request_size");
          }
          const family = sessions.get(hash(cookie(req, sessionCookie)))?.family ??
            transactions.get(hash(cookie(req, txCookie)))?.family ?? { generation: 0 };
          revoke(family);
          if (transactions.size >= 1000)
            throw new HttpError(503, "identity_unavailable");
          const token = random(),
            state = oidc.randomState(),
            nonce = oidc.randomNonce(),
            verifier = oidc.randomPKCECodeVerifier();
          transactions.set(hash(token), {
            state,
            nonce,
            verifier,
            started: now(),
            expires: now() + 300,
            consumed: false,
            family,
            generation: family.generation,
            mc,
          });
          const target = oidc.buildAuthorizationUrl(options.config, {
            redirect_uri: options.redirect,
            response_type: "code",
            response_mode: "query",
            scope: "openid",
            state,
            nonce,
            code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
            code_challenge_method: "S256",
            max_age: "0",
            prompt: "login",
          });
          return req.headers.get("accept") === "application/json"
            ? response({ authorizationUrl: target.href }, 200, {
                "Set-Cookie": setCookie(txCookie, token, 300, "Lax"),
              })
            : response({}, 303, {
                Location: target.href,
                "Set-Cookie": setCookie(txCookie, token, 300, "Lax"),
              });
        }
        if (url.pathname === "/v1/admin/callback") {
          if (req.method !== "GET") throw new HttpError(405, "method");
          const transactionKey = hash(cookie(req, txCookie)),
            tx = transactions.get(transactionKey);
          // Retain the bounded attempt through async exchange so a newer login
          // carrying its cookie can revoke its family. Replay stays one-use.
          if (!tx || tx.consumed || tx.expires <= now() || tx.generation !== tx.family.generation)
            throw new HttpError(401, "unauthorized");
          tx.consumed = true;
          try {
            const tokens = await oidc.authorizationCodeGrant(
              options.config,
              url,
              {
                pkceCodeVerifier: tx.verifier,
                expectedState: tx.state,
                expectedNonce: tx.nonce,
                idTokenExpected: true,
                maxAge: 3600,
              },
            );
            const claims = tokens.claims()!;
            const clientId = options.config.clientMetadata().client_id,
              amr = claims.amr;
            if (
              !(typeof claims.aud === "string" ? claims.aud.length > 0 :
                Array.isArray(claims.aud) && claims.aud.length > 0 &&
                claims.aud.every(value => typeof value === "string" && value.length > 0)) ||
              !options.subjects.includes(claims.sub) ||
              typeof claims.iat !== "number" ||
              !Number.isFinite(claims.iat) ||
              claims.iat < now() - 3600 ||
              claims.iat > now() + 30 ||
              typeof claims.exp !== "number" ||
              !Number.isFinite(claims.exp) ||
              claims.exp <= now() ||
              typeof claims.auth_time !== "number" ||
              !Number.isFinite(claims.auth_time) ||
              claims.auth_time < now() - 3600 ||
              claims.auth_time > now() + 30 ||
              claims.auth_time < tx.started - 30 ||
              (claims.azp !== undefined && claims.azp !== clientId) ||
              (Array.isArray(claims.aud) &&
                claims.aud.length > 1 &&
                claims.azp !== clientId) ||
              !Array.isArray(amr) ||
              !amr.every(value => typeof value === "string" && value.length > 0) ||
              !options.mfaMethods.some((method) => amr.includes(method))
            )
              throw new HttpError(401, "unauthorized");
            const expires = Math.min(
              now() + 900,
              claims.exp,
              Number(claims.auth_time) + 3600,
            );
            if (!Number.isFinite(expires) || expires <= now())
              throw new HttpError(401, "unauthorized");
            if (sessions.size >= 1000)
              throw new HttpError(503, "identity_unavailable");
            sessions.delete(hash(cookie(req, sessionCookie)));
            // Final authority check AFTER all provider/JWKS awaits. No await may
            // separate this check from random session creation and map insertion.
            if (tx.expires <= now() || tx.generation !== tx.family.generation)
              throw new HttpError(401, "unauthorized");
            const token = random();
            sessions.set(hash(token), {
              actor: { sub: claims.sub, role: "moderator" },
              csrf: random(),
              expires,
              family: tx.family,
            });
            if(tx.mc){
              const location=options.mc!.complete(tx.mc,{sub:claims.sub,role:'moderator'},expires,hash(token));
              return response({},303,{Location:location,'Set-Cookie':setCookie(txCookie,'',0,'Lax')});
            }
            const result = response({}, 303, {
              Location: options.origin + "/admin/",
            });
            result.headers.append(
              "Set-Cookie",
              setCookie(txCookie, "", 0, "Lax"),
            );
            result.headers.append(
              "Set-Cookie",
              setCookie(
                sessionCookie,
                token,
                Math.floor(expires - now()),
                "Strict",
              ),
            );
            return result;
          } finally {
            transactions.delete(transactionKey);
          }
        }
        const hasSessionCookie = (req.headers.get("cookie") ?? "").includes(
          sessionCookie + "=",
        );
        if (hasSessionCookie || url.pathname === "/v1/admin/logout") {
          const session = sessions.get(hash(cookie(req, sessionCookie)));
          if (!session) throw new HttpError(401, "unauthorized");
          if (
            ["cross-site", "same-site"].includes(
              req.headers.get("sec-fetch-site") ?? "",
            )
          )
            throw new HttpError(403, "origin");
          if (req.method !== "GET") {
            if (req.method !== "POST") throw new HttpError(405, "method");
            if (
              req.headers.get("origin") !== options.origin ||
              req.headers.get("x-csrf-token") !== session.csrf
            )
              throw new HttpError(403, "csrf");
          }
          if (url.pathname === "/v1/admin/logout") {
            if (req.method !== "POST") throw new HttpError(405, "method");
            if (
              !req.headers.get("content-type")?.startsWith("application/json")
            )
              throw new HttpError(415, "content_type");
            if (Buffer.byteLength(await req.text()) > 16384)
              throw new HttpError(413, "request_size");
            revoke(session.family);
            const result = response({ authenticated: false });
            result.headers.append(
              "Set-Cookie",
              setCookie(sessionCookie, "", 0, "Strict"),
            );
            result.headers.append(
              "Set-Cookie",
              setCookie(txCookie, "", 0, "Lax"),
            );
            return result;
          }
        }
        if (url.pathname === "/v1/admin/session") {
          if (req.method !== "GET") throw new HttpError(405, "method");
          const session = sessions.get(hash(cookie(req, sessionCookie)));
          if (!session) throw new HttpError(401, "unauthorized");
          return response({
            authenticated: true,
            csrf: session.csrf,
            expires: session.expires,
          });
        }
        return null;
      } catch (e) {
        return response(
          { error: e instanceof HttpError ? e.message : "unauthorized" },
          e instanceof HttpError ? e.status : 401,
        );
      }
    },
    isSessionActive(actor: string, sessionHash: string) {
      prune();
      return sessions.get(sessionHash)?.actor.sub === actor;
    },
    async authenticate(req: Request): Promise<Actor | null> {
      prune();
      if (new URL(req.url).origin !== options.origin)
        throw new HttpError(403, "origin");
      return sessions.get(hash(cookie(req, sessionCookie)))?.actor ?? null;
    },
  };
}
// Transport injection is an explicit per-instance test seam; production startup
// never supplies it, and there is no environment flag enabling insecure TLS.
export async function discoverBrowserAuth(
  env: NodeJS.ProcessEnv,
  transport?: oidc.CustomFetch,
  mc?: BrowserIdentity['mc'],
) {
  const issuer = env.OIDC_ISSUER!;
  if (
    env.OIDC_DISCOVERY_URL !==
    issuer.replace(/\/$/, "") + "/.well-known/openid-configuration"
  )
    throw new Error("Exact discovery binding required");
  const config = await oidc.discovery(
    new URL(issuer),
    env.OIDC_CLIENT_ID!,
    {
      id_token_signed_response_alg: "RS256",
      default_max_age: 3600,
    },
    oidc.ClientSecretBasic(env.OIDC_CLIENT_SECRET!),
    {
      timeout: 5,
      execute: [oidc.enableNonRepudiationChecks],
      ...(transport ? { [oidc.customFetch]: transport } : {}),
    },
  );
  return createBrowserAuth({
    config,
    mc,
    issuer,
    jwksUrl: env.OIDC_JWKS_URL!,
    origin: env.REVIEWS_ADMIN_ORIGIN!,
    redirect: env.OIDC_REDIRECT_URI!,
    subjects: env.OIDC_SUBJECTS!.split(","),
    mfaMethods: env.OIDC_MFA_METHODS!.split(","),
  });
}
