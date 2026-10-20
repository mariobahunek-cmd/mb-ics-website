import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
import { retryMail } from "../src/mail.ts";
import { confirm } from "../src/confirm.ts";
import { moderate } from "../src/admin.ts";
import type { Context } from "../src/context.ts";
const binding = {apiKey: "synthetic-sending-only", from: "reviews@example.invalid"};
const receipt = {id: "00000000-0000-4000-8000-000000000001"};
async function adapter() {
  const m = await import("../src/mail-provider.ts").catch(() => null);
  assert.ok(m, "shared-pool provider adapter must exist");
  return m.sendSharedMail;
}
test("shared-pool provider dispatch validates acceptance, pins endpoint and preserves private idempotency identity", async () => {
  const send = await adapter();
  const f = fixture(); let calls = 0;
  try {
    Object.assign(f.ctx, {mailEnabled: true});
    (f.ctx as Context).send = async (mail, id, dispatch) => send(binding, mail, id, async (input: any, init: any) => {
      calls++;
      assert.equal(String(input), "https://api.resend.com/emails");
      assert.equal(init.method, "POST"); assert.equal(init.redirect, "error");
      assert.ok(init.signal instanceof AbortSignal);
      const h = new Headers(init.headers); assert.equal(h.get("Idempotency-Key"), "review-" + id);
      assert.equal(h.get("Authorization"), "Bearer " + binding.apiKey);
      const body = JSON.parse(init.body); assert.equal(body.from, binding.from);
      assert.deepEqual(body.to, [valid.email]); assert.ok(body.text.includes(mail.confirm));
      return new Response(JSON.stringify(receipt));
    }, dispatch);
    const response = await submit(f.ctx, valid, "shared-positive-00001", "ip");
    assert.deepEqual(response, {status: "pending_email"});
    assert.equal(f.db.prepare("SELECT state FROM outbox").get()!.state, "sent");
    assert.equal(f.db.prepare("SELECT payload_cipher FROM outbox").get()!.payload_cipher, "");
    await submit(f.ctx, valid, "shared-positive-00001", "ip"); await retryMail(f.ctx);
    assert.equal(calls, 1);
    assert.equal(f.db.prepare("SELECT status FROM reviews").get()!.status, "pending_email");
    const id = String(f.db.prepare("SELECT id FROM reviews").get()!.id);
    assert.throws(() => moderate(f.ctx, {sub: "fixture", role: "moderator"}, id, "published", "no verification"));
    assert.throws(() => confirm(f.ctx, "q".repeat(43)), /invalid_token/);
  } finally {f.db.close();}
});
for (const outcome of ["rate429", "daily429", "monthly429", "timeout", "empty200", "malformed200", "oversize200", "server500", "conflict409"])
  test(`shared-pool ${outcome} stays unverified, bounded to twelve attempts and expires without sending`, async () => {
    const send = await adapter(); const f = fixture(); let calls = 0;
    try {
      Object.assign(f.ctx, {mailEnabled: true});
      (f.ctx as Context).send = async (mail, id, dispatch) => send(binding, mail, id, async () => {
        calls++;
        if (outcome === "timeout") throw new DOMException("synthetic unknown outcome", "TimeoutError");
        if (outcome === "empty200") return new Response("");
        if (outcome === "malformed200") return new Response(JSON.stringify({success: true}));
        if (outcome === "oversize200") return new Response("x".repeat(5000));
        const name = outcome === "daily429" ? "daily_quota_exceeded" : outcome === "monthly429" ? "monthly_quota_exceeded" : "rate_limit_exceeded";
        return new Response(JSON.stringify({name, message: "synthetic private error, never surfaced"}), {status: outcome === "server500" ? 500 : outcome === "conflict409" ? 409 : 429});
      }, dispatch);
      assert.deepEqual(await submit(f.ctx, valid, "shared-negative-0001", "ip"), {status: "pending_email"});
      for (let n = 0; n < 20; n++) {const now = f.ctx.now(); f.ctx.now = () => now + 3600001; await retryMail(f.ctx);}
      assert.equal(calls, 12); assert.equal(f.db.prepare("SELECT attempts FROM outbox").get()!.attempts, 12);
      assert.equal(f.db.prepare("SELECT state FROM outbox").get()!.state, "queued");
      assert.equal(f.db.prepare("SELECT status FROM reviews").get()!.status, "pending_email");
      assert.equal(f.db.prepare("SELECT count(*) n FROM rate_limits WHERE count=1").get()!.n, 4);
      const now = f.ctx.now(); f.ctx.now = () => now + 86400001;
      await retryMail(f.ctx); await submit(f.ctx, valid, "shared-negative-0001", "ip2");
      assert.equal(calls, 12);
    } finally {f.db.close();}
  });
test("missing shared-pool binding rejects before transport, never implies shared reservation", async () => {
  const send = await adapter(); let calls = 0;
  await assert.rejects(() => send(null, {to:valid.email, language:"en", confirm:"synthetic", manage:"synthetic"}, "fixture", async () => {calls++; return new Response(JSON.stringify(receipt));}), /mail_paused/);
  assert.equal(calls, 0);
});
test("omitted Context enable flag closes admission and dispatch before all writes/transport", async () => {
  const f = fixture();
  try {
    const ctx: Context = {...f.ctx}; delete ctx.mailEnabled;
    await assert.rejects(() => submit(ctx, valid, "shared-no-flag-0001", "ip"), /mail_paused/);
    await retryMail(ctx);
    for (const table of ["reviews", "outbox", "recovery_events", "rate_limits"]) assert.equal(f.db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n, 0);
    assert.equal(f.mail.length, 0);
  } finally {f.db.close();}
});
