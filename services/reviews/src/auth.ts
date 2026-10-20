import { createPublicKey, verify, type JsonWebKey } from "node:crypto";
import { HttpError } from "./schema.ts";
import type { Actor } from "./admin.ts";
export interface IdentityConfig {
  issuer: string;
  audience: string;
  browserClientId?: string;
  subjects: string[];
  mfaMethods: string[];
  now: () => number;
}
type JWK = JsonWebKey & { kid?: string; alg?: string; use?: string };
export function verifyIdentity(
  jwt: string,
  keys: JWK[],
  config: IdentityConfig,
): Actor {
  try {
    if (jwt.length > 12000) throw 0;
    const parts = jwt.split(".");
    if (parts.length !== 3) throw 0;
    const [h, p, s] = parts;
    const header = JSON.parse(Buffer.from(h, "base64url").toString());
    const claims = JSON.parse(Buffer.from(p, "base64url").toString());
    if (header.alg !== "RS256" || typeof header.kid !== "string" || header.crit)
      throw 0;
    const key = keys.find(
      (k) =>
        k.kid === header.kid &&
        k.kty === "RSA" &&
        (!k.alg || k.alg === "RS256") &&
        (!k.use || k.use === "sig"),
    );
    if (
      !key ||
      !verify(
        "RSA-SHA256",
        Buffer.from(`${h}.${p}`),
        createPublicKey({ key, format: "jwk" }),
        Buffer.from(s, "base64url"),
      )
    )
      throw 0;
    const now = config.now();
    if (
      claims.iss !== config.issuer ||
      !(typeof claims.aud === "string" ? claims.aud.length > 0 :
        Array.isArray(claims.aud) && claims.aud.length > 0 &&
        claims.aud.every((value: unknown) => typeof value === "string" && value.length > 0)) ||
      !(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(
        config.audience,
      ) ||
      // A browser-consumer token is never a tooling credential, even when
      // the signed audience also includes the tooling API.
      (config.browserClientId !== undefined &&
        (Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(config.browserClientId)) ||
      !config.subjects.includes(claims.sub) ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= now ||
      !Number.isFinite(claims.iat) ||
      claims.iat > now + 30 ||
      claims.iat < now - 3600 ||
      (claims.nbf !== undefined &&
        (!Number.isFinite(claims.nbf) || claims.nbf > now)) ||
      !Number.isFinite(claims.auth_time) ||
      claims.auth_time < now - 3600 ||
      claims.auth_time > now + 30 ||
      !Array.isArray(claims.amr) ||
      !claims.amr.every((value: unknown) => typeof value === "string" && value.length > 0) ||
      !config.mfaMethods.some((m) => claims.amr.includes(m))
    )
      throw 0;
    return { sub: claims.sub, role: "moderator" };
  } catch {
    throw new HttpError(401, "unauthorized");
  }
}
export function identityVerifier(config: IdentityConfig, jwksUrl: string) {
  let keys: JWK[] = [];
  let expiry = 0;
  if (new URL(jwksUrl).protocol !== "https:")
    throw new Error("JWKS must use HTTPS");
  return async (jwt: string) => {
    if (Date.now() > expiry) {
      const r = await fetch(jwksUrl, {
        signal: AbortSignal.timeout(5000),
        redirect: "error",
      });
      if (!r.ok) throw new HttpError(503, "identity_unavailable");
      const body = (await r.json()) as { keys: JWK[] };
      if (!Array.isArray(body.keys) || body.keys.length > 30)
        throw new HttpError(503, "identity_unavailable");
      keys = body.keys;
      expiry = Date.now() + 300000;
    }
    return verifyIdentity(jwt, keys, config);
  };
}
