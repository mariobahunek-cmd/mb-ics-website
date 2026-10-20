// Entrypoint integration, subprocess-only synthetic HTTP. No production test flag.
import assert from "node:assert/strict";
import { request } from "node:http";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { provider } from "./b3-provider.ts";
import { openDB } from "../../src/db.ts";
import { probeBackup } from "../../src/backup-operations.ts";
import { valid as baseValid } from "./fixture.ts";
const valid = {...baseValid, challenge: "synthetic-challenge"};
const [directory, recipient, mode] = process.argv.slice(2);
let now = Date.UTC(2026, 9, 17, 12); Date.now = () => now;
const p = provider(recipient, directory, () => now);
const sent: {key: string; body: any}[] = []; let challenges = 0;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url === "https://identity.invalid/.well-known/openid-configuration") return new Response(JSON.stringify({
    issuer: "https://identity.invalid", authorization_endpoint: "https://identity.invalid/auth", token_endpoint: "https://identity.invalid/token",
    jwks_uri: "https://identity.invalid/keys", response_types_supported: ["code"], subject_types_supported: ["public"], id_token_signing_alg_values_supported: ["RS256"],
  }));
  if (url === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
    challenges++; if (mode === "stale-after-challenge") now += 121000;
    return new Response(JSON.stringify({success: true, hostname: "public.invalid", action: "review"}));
  }
  if (url === "https://api.resend.com/emails") {
    sent.push({key: new Headers(init?.headers).get("Idempotency-Key")!, body: JSON.parse(String(init?.body))});
    return new Response(JSON.stringify({id: "00000000-0000-4000-8000-000000000001"}));
  }
  if (url.includes(".backblazeb2.com/") || url.includes(".backblaze.com/")) return p.transport(input, init);
  throw new Error("Unexpected synthetic integration outbound request");
};
async function call(path: string, body?: unknown, id = "http-shared-pool-0001") {
  return new Promise<{status: number; body: any}>((resolve, reject) => {
    const req = request({hostname: "127.0.0.1", port: Number(process.env.PORT), path, method: body === undefined ? "GET" : "POST",
      headers: {Host: "api.invalid", Origin: path.startsWith("/v1/admin/") ? "https://api.invalid" : "https://public.invalid", "Content-Type": "application/json", "Idempotency-Key": id}}, res => {
      let text = ""; res.on("data", b => text += b); res.on("end", () => resolve({status: res.statusCode!, body: text ? JSON.parse(text) : null}));
    });
    req.on("error", reject); req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}
try {
  await import("../../src/server.ts");
  if (mode !== "no-backup") {
    for (let n = 0; n < 500 && !probeBackup(directory, now).admitted; n++) await new Promise(r => setTimeout(r, 20));
    assert.equal(probeBackup(directory, now).admitted, true, "real scheduled synthetic backup must establish admission");
  }
  assert.equal((await call("/__local/login")).status, 404);
  const response = await call("/v1/reviews", valid);
  const db = openDB(join(directory, "reviews.sqlite"));
  try {
    if (mode === "enabled") {
      assert.equal(response.status, 202, JSON.stringify(response));
      assert.deepEqual(response.body, {status: "pending_email"});
      assert.equal(sent.length, 1); assert.equal(challenges, 1);
      assert.equal(db.prepare("SELECT state FROM outbox").get()!.state, "sent");
      const id = String(db.prepare("SELECT id FROM reviews").get()!.id);
      assert.equal(db.prepare("SELECT status FROM reviews").get()!.status, "pending_email");
      assert.equal((await call("/v1/reviews")).body.summary.count, 0);
      assert.equal((await call("/v1/admin/reviews/" + id, {status: "published", reason: "unverified"})).status, 401);
      const duplicates = await Promise.all([call("/v1/reviews", valid), call("/v1/reviews", valid)]);
      assert.deepEqual(duplicates.map(r => r.status), [202,202]); assert.equal(sent.length, 1);
      assert.equal(db.prepare("SELECT count(*) n FROM outbox").get()!.n, 1);
      const privateLink = sent[0].body.text.match(/https:\/\/public\.invalid\/review\/\?lang=en#confirm=([A-Za-z0-9_-]{43})/);
      assert.ok(privateLink, "confirmation is sent only through private message payload");
      assert.equal((await call("/v1/reviews/confirm", {token: "q".repeat(43)})).status, 400);
      assert.deepEqual((await call("/v1/reviews/confirm", {token: privateLink[1]})).body, {status: "pending_moderation"});
      assert.equal(db.prepare("SELECT status FROM reviews").get()!.status, "pending_moderation");
      assert.equal((await call("/v1/reviews")).body.summary.count, 0);
      assert.equal((await call("/v1/reviews/confirm", {token: privateLink[1]})).status, 400);
      assert.equal((await call("/v1/admin/reviews")).status, 401);
    } else {
      assert.equal(response.status, 503, JSON.stringify(response));
      assert.equal(response.body.error, mode === "paused" ? "mail_paused" : "backup_unavailable");
      assert.equal(sent.length, 0); assert.equal(challenges, mode === "stale-after-challenge" ? 1 : 0);
      for (const table of ["reviews", "outbox", "recovery_events"]) assert.equal(db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n, 0);
    }
    // Real guards remain independent; this test never substitutes backup evidence.
    const privateFiles = readFileSync(join(directory, "reviews.sqlite")); assert.ok(privateFiles.length > 0);
    console.log(JSON.stringify({proof: "actual-production-entrypoint-shared-mail", mode, sends: sent.length, challenges}));
  } finally {db.close();}
  process.kill(process.pid, "SIGTERM");
} catch (error) { console.error(error); process.exit(1); }
