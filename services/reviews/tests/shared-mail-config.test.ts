import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.ts";
const prod = {
  REVIEWS_MODE: "production", REVIEWS_KEY: Buffer.alloc(32, 7).toString("base64"),
  REVIEWS_SITE_URL: "https://public.example.invalid", REVIEWS_API_URL: "https://api.example.invalid",
  OIDC_ISSUER: "https://id.example.invalid", OIDC_CLIENT_ID: "browser", OIDC_CLIENT_SECRET: "synthetic",
  OIDC_DISCOVERY_URL: "https://id.example.invalid/.well-known/openid-configuration",
  OIDC_REDIRECT_URI: "https://api.example.invalid/v1/admin/callback", REVIEWS_ADMIN_ORIGIN: "https://api.example.invalid",
  OIDC_AUDIENCE: "api", OIDC_JWKS_URL: "https://id.example.invalid/jwks", OIDC_SUBJECTS: "fixture", OIDC_MFA_METHODS: "mfa",
  TURNSTILE_SECRET: "synthetic", TURNSTILE_SITEKEY: "synthetic", TURNSTILE_HOSTNAME: "public.example.invalid",
  RESEND_API_KEY: "synthetic-sending-only-key", MAIL_FROM: "reviews@example.invalid",
};
test("production mail defaults paused; only explicit validated shared-pool opts in, never local outbound", () => {
  assert.equal((loadConfig(prod) as any).mailEnabled, false);
  assert.equal((loadConfig({...prod, REVIEWS_MAIL_MODE: "paused"}) as any).sharedPool, null);
  const enabled = loadConfig({...prod, REVIEWS_MAIL_MODE: "shared-pool"}) as any;
  assert.equal(enabled.mailEnabled, true);
  assert.deepEqual(enabled.sharedPool, { apiKey: prod.RESEND_API_KEY, from: prod.MAIL_FROM });
  assert.equal((loadConfig({REVIEWS_MODE: "local"}) as any).mailEnabled, true);
  for (const patch of [
    {REVIEWS_MAIL_MODE: "true"}, {REVIEWS_MAIL_MODE: ""}, {REVIEWS_MAIL_MODE: "shared-pool "},
    {REVIEWS_MAIL_MODE: "shared-pool", RESEND_API_KEY: "bad\nheader"},
    {REVIEWS_MAIL_MODE: "shared-pool", RESEND_API_KEY: " synthetic"},
    {REVIEWS_MAIL_MODE: "shared-pool", MAIL_FROM: "reviews@example.invalid\nBcc: other@example.invalid"},
    {REVIEWS_MAIL_MODE: "shared-pool", MAIL_FROM: "not-a-mailbox"},
    {REVIEWS_MAIL_MODE: "shared-pool", MAIL_FROM: "reviews@bad..invalid"},
    {REVIEWS_MAIL_MODE: "shared-pool", MAIL_FROM: ".reviews@example.invalid"},
    {REVIEWS_MAIL_MODE: "shared-pool", MAIL_FROM: "reviews@-bad.invalid"},
    {REVIEWS_MAIL_MODE: "shared-pool", MAIL_FROM: "r".repeat(65) + "@example.invalid"},
  ]) assert.throws(() => loadConfig({...prod, ...patch}), /configuration/);
  assert.throws(() => loadConfig({REVIEWS_MODE: "local", REVIEWS_MAIL_MODE: "shared-pool"}), /configuration/);
});
