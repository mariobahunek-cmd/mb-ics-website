import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyIdentity } from "../src/auth.ts";
test("production identity requires signed pinned issuer/audience, allowlisted subject and recent MFA", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = {
    ...publicKey.export({ format: "jwk" }),
    kid: "test",
    alg: "RS256",
    use: "sig",
  };
  const now = 1800000000;
  const config = {
    issuer: "https://identity.example.invalid/",
    audience: "reviews",
    subjects: ["owner"],
    mfaMethods: ["mfa"],
    now: () => now,
  };
  const issue = (patch: object = {}, header: object = {}) => {
    const h = Buffer.from(
        JSON.stringify({ alg: "RS256", kid: "test", ...header }),
      ).toString("base64url"),
      p = Buffer.from(
        JSON.stringify({
          iss: config.issuer,
          aud: "reviews",
          sub: "owner",
          exp: now + 60,
          iat: now,
          auth_time: now,
          amr: ["mfa"],
          ...patch,
        }),
      ).toString("base64url");
    return `${h}.${p}.${sign("RSA-SHA256", Buffer.from(`${h}.${p}`), privateKey).toString("base64url")}`;
  };
  assert.equal(verifyIdentity(issue(), [jwk], config).sub, "owner");
  for (const patch of [
    { iss: "evil" },
    { aud: "other" },
    { sub: "stranger" },
    { exp: now - 1 },
    { amr: ["pwd"] },
    { auth_time: now - 4000 },
    { iat: now + 100 },
    { nbf: now + 100 },
  ])
    assert.throws(
      () => verifyIdentity(issue(patch), [jwk], config),
      /unauthorized/,
    );
  assert.throws(
    () => verifyIdentity(issue({}, { alg: "none" }), [jwk], config),
    /unauthorized/,
  );
  assert.throws(
    () => verifyIdentity(issue().slice(0, -5) + "aaaaa", [jwk], config),
    /unauthorized/,
  );
});
