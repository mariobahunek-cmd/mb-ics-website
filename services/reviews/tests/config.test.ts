import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.ts";
test("production fails closed and synthetic adapters can bind only to explicit loopback local mode", () => {
  assert.throws(() => loadConfig({}), /configuration/);
  assert.throws(
    () => loadConfig({ REVIEWS_MODE: "local", HOST: "0.0.0.0" }),
    /loopback/,
  );
  assert.throws(
    () =>
      loadConfig({ REVIEWS_MODE: "production", REVIEWS_LOCAL_AUTH: "true" }),
    /configuration/,
  );
  const local = loadConfig({ REVIEWS_MODE: "local" });
  assert.equal(local.host, "127.0.0.1");
  assert.equal(local.local, true);
});
test("production requires exact HTTPS origins and cannot silently use weak MFA or local adapters", () => {
  const prod = {
    REVIEWS_MODE: "production",
    REVIEWS_KEY: Buffer.alloc(32, 9).toString("base64"),
    REVIEWS_SITE_URL: "https://www.example.invalid",
    REVIEWS_API_URL: "https://api.example.invalid",
    OIDC_ISSUER: "https://id.example.invalid/",
    OIDC_AUDIENCE: "reviews",
    OIDC_CLIENT_ID: "browser-client",
    OIDC_CLIENT_SECRET: "synthetic-server-secret",
    OIDC_REDIRECT_URI: "https://api.example.invalid/v1/admin/callback",
    OIDC_DISCOVERY_URL:
      "https://id.example.invalid/.well-known/openid-configuration",
    REVIEWS_ADMIN_ORIGIN: "https://api.example.invalid",
    OIDC_JWKS_URL: "https://id.example.invalid/jwks",
    OIDC_SUBJECTS: "synthetic-owner",
    OIDC_MFA_METHODS: "mfa",
    TURNSTILE_SECRET: "synthetic",
    TURNSTILE_SITEKEY: "synthetic",
    TURNSTILE_HOSTNAME: "www.example.invalid",
    RESEND_API_KEY: "synthetic",
    MAIL_FROM: "synthetic@example.invalid",
  };
  assert.equal(loadConfig(prod).local, false);
  assert.equal(
    loadConfig({ ...prod, OIDC_ISSUER: "https://id.example.invalid" }).local,
    false,
  );
  for (const patch of [
    { REVIEWS_SITE_URL: "http://www.example.invalid" },
    { REVIEWS_SITE_URL: "https://www.example.invalid/path" },
    { REVIEWS_API_URL: "https://api.example.invalid/" },
    { OIDC_MFA_METHODS: "pwd" },
    { REVIEWS_KEY: "bad" },
    { OIDC_CLIENT_ID: "" },
    { OIDC_AUDIENCE: "browser-client" },
    { OIDC_CLIENT_SECRET: "" },
    { OIDC_REDIRECT_URI: "https://evil.example.invalid/v1/admin/callback" },
    { REVIEWS_ADMIN_ORIGIN: "https://www.example.invalid" },
    {
      OIDC_DISCOVERY_URL:
        "https://evil.example.invalid/.well-known/openid-configuration",
    },
    { REVIEWS_LOCAL_MAIL: "true" },
  ])
    assert.throws(() => loadConfig({ ...prod, ...patch }), /configuration/);
});
