import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { spawnSync } from "node:child_process";
for (const mode of ["enabled", "paused", "no-backup", "stale-after-challenge"]) test(`actual production HTTP shared mail: ${mode}`, async () => {
  const dir = await mkdtemp(join(tmpdir(), "shared-mail-http-"));
  try {
    const identity = join(dir, "synthetic.age");
    assert.equal(spawnSync("age-keygen", ["-o", identity]).status, 0);
    const recipient = spawnSync("age-keygen", ["-y", identity], {encoding:"utf8"}).stdout.trim();
    const probe = createServer(); await new Promise<void>(r => probe.listen(0, "127.0.0.1", r));
    const port = (probe.address() as {port:number}).port; await new Promise<void>(r => probe.close(() => r()));
    const env = {
      PATH: process.env.PATH, TMPDIR: process.env.TMPDIR,
      REVIEWS_MODE: "production", HOST: "127.0.0.1", PORT: String(port), REVIEWS_DATA_DIR: dir,
      REVIEWS_SITE_URL: "https://public.invalid", REVIEWS_API_URL: "https://api.invalid", REVIEWS_ADMIN_ORIGIN: "https://api.invalid",
      REVIEWS_KEY: Buffer.alloc(32,7).toString("base64"), REVIEWS_MAIL_MODE: mode === "paused" ? "paused" : "shared-pool",
      OIDC_ISSUER: "https://identity.invalid", OIDC_CLIENT_ID: "browser-fixture", OIDC_CLIENT_SECRET: "synthetic",
      OIDC_AUDIENCE: "api-fixture", OIDC_JWKS_URL: "https://identity.invalid/keys", OIDC_SUBJECTS: "owner-fixture", OIDC_MFA_METHODS: "otp",
      OIDC_DISCOVERY_URL: "https://identity.invalid/.well-known/openid-configuration", OIDC_REDIRECT_URI: "https://api.invalid/v1/admin/callback",
      TURNSTILE_SECRET: "synthetic", TURNSTILE_SITEKEY: "synthetic", TURNSTILE_HOSTNAME: "public.invalid",
      RESEND_API_KEY: "synthetic-sending-only", MAIL_FROM: "reviews@example.invalid",
      ...(mode === "no-backup" ? {} : {REVIEWS_RECOVERY_PROVIDER: "b2", REVIEWS_B2_KEY_ID: "writer-synthetic", REVIEWS_B2_APPLICATION_KEY: "synthetic",
        REVIEWS_B2_BUCKET_ID: "synthetic", REVIEWS_B2_PREFIX: "reviews/", REVIEWS_BACKUP_RECIPIENT: recipient}),
    };
    const r = spawnSync(process.execPath, ["--experimental-strip-types", new URL("./helpers/shared-mail-server.ts", import.meta.url).pathname, dir, recipient, mode], {env, encoding:"utf8", timeout:20000});
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(r.stdout.includes('"proof":"actual-production-entrypoint-shared-mail"'));
    assert.ok(r.stdout.includes('"mode":"'+mode+'"'));
  } finally {await rm(dir, {recursive:true, force:true});}
});
