import { createServer } from "node:http";
import {
  generateKeyPairSync,
  sign,
  randomBytes,
  createHash,
} from "node:crypto";
import type { AddressInfo } from "node:net";
import * as oidc from "openid-client";

function decodeBasic(header: string | undefined) {
  if (!header?.startsWith("Basic ")) return "";
  try {
    const parts = Buffer.from(header.slice(6), "base64").toString().split(":");
    if (parts.length !== 2) return "";
    return parts
      .map((p) => decodeURIComponent(p.replace(/\+/g, " ")))
      .join(":");
  } catch {
    return "";
  }
}
export async function provider() {
  const issuer = "https://id.example.invalid";
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = {
    ...publicKey.export({ format: "jwk" }),
    kid: "fixture",
    alg: "RS256",
    use: "sig",
  };
  const codes = new Map<string, URL>();
  let patch: Record<string, unknown> = {};
  let invalidSignature = false;
  let signingAlgorithm = "RS256";
  let expectedAuthorization: string | undefined;
  let exchangeCount = 0;
  let hold: { path: string; entered: () => void; gate: Promise<void> } | undefined;
  async function pause(path: string) {
    if (hold?.path !== path) return;
    const current = hold; hold = undefined;
    current.entered();
    await current.gate;
  }
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, issuer);
    res.setHeader("Content-Type", "application/json");
    if (url.pathname === "/.well-known/openid-configuration") {
      res.end(
        JSON.stringify({
          issuer,
          authorization_endpoint: issuer + "/authorize",
          token_endpoint: issuer + "/token",
          jwks_uri: issuer + "/jwks",
          response_types_supported: ["code"],
          subject_types_supported: ["public"],
          id_token_signing_alg_values_supported: ["RS256"],
          code_challenge_methods_supported: ["S256"],
        }),
      );
    } else if (url.pathname === "/jwks") {
      await pause("/jwks");
      res.end(JSON.stringify({ keys: [jwk] }));
    } else if (url.pathname === "/authorize") {
      const code = randomBytes(24).toString("base64url");
      codes.set(code, url);
      const callback = new URL(url.searchParams.get("redirect_uri")!);
      callback.searchParams.set("code", code);
      callback.searchParams.set("state", url.searchParams.get("state")!);
      res.writeHead(302, { Location: callback.href }).end();
    } else if (url.pathname === "/token") {
      exchangeCount++;
      let body = "";
      for await (const c of req) body += c;
      const form = new URLSearchParams(body),
        code = form.get("code")!,
        auth = codes.get(code);
      codes.delete(code);
      if (
        !auth ||
        (expectedAuthorization !== undefined &&
          decodeBasic(req.headers.authorization) !== expectedAuthorization) ||
        form.get("redirect_uri") !== auth.searchParams.get("redirect_uri") ||
        createHash("sha256")
          .update(form.get("code_verifier") ?? "")
          .digest("base64url") !== auth.searchParams.get("code_challenge")
      ) {
        res.writeHead(400).end(JSON.stringify({ error: "invalid_grant" }));
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        iss: issuer,
        aud: "browser-client",
        sub: "stable-moderator",
        iat: now,
        exp: now + 600,
        auth_time: now,
        amr: ["mfa"],
        nonce: auth.searchParams.get("nonce"),
        ...patch,
      };
      const h = Buffer.from(
        JSON.stringify({ alg: signingAlgorithm, kid: "fixture" }),
      ).toString("base64url");
      const p = Buffer.from(JSON.stringify(claims)).toString("base64url");
      const signature = sign(
        signingAlgorithm === "RS384" ? "RSA-SHA384" : "RSA-SHA256",
        Buffer.from(h + "." + p),
        privateKey,
      ).toString("base64url");
      await pause("/token");
      res.end(
        JSON.stringify({
          access_token: "SYNTHETIC-NEVER-PERSIST",
          token_type: "Bearer",
          expires_in: 600,
          id_token:
            h +
            "." +
            p +
            "." +
            (invalidSignature ? signature.slice(4) : signature),
        }),
      );
    } else res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  // Isolated test transport: HTTPS logical endpoints -> a real loopback HTTP fixture.
  // No insecure-request extension, global fetch/TLS changes or environment switch.
  const transport: oidc.CustomFetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.origin !== issuer)
      throw new Error("Unexpected fixture transport target");
    return fetch(origin + url.pathname + url.search, init as RequestInit);
  };
  const config = await oidc.discovery(
    new URL(issuer),
    "browser-client",
    { id_token_signed_response_alg: "RS256", default_max_age: 3600 },
    oidc.None(),
    {
      [oidc.customFetch]: transport,
      execute: [oidc.enableNonRepudiationChecks],
    },
  );
  return {
    holdNext: (path = "/token") => {
      let release!: () => void, entered!: () => void;
      const ready = new Promise<void>(r => { entered = r; });
      const gate = new Promise<void>(r => { release = r; });
      hold = { path, entered, gate };
      return { ready, release };
    },
    issue: (claims: Record<string, unknown>) => {
      const h = Buffer.from(JSON.stringify({ alg: "RS256", kid: "fixture" })).toString("base64url");
      const p = Buffer.from(JSON.stringify(claims)).toString("base64url");
      return h + "." + p + "." + sign("RSA-SHA256", Buffer.from(h + "." + p), privateKey).toString("base64url");
    },
    config,
    issuer,
    origin,
    transport,
    setClaims: (value: Record<string, unknown>) => {
      patch = value;
    },
    badSignature: () => {
      invalidSignature = true;
    },
    requireBasic: (secret: string) => {
      expectedAuthorization = "browser-client:" + secret;
    },
    setAlgorithm: (algorithm: string) => {
      signingAlgorithm = algorithm;
    },
    exchanges: () => exchangeCount,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
