import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
import { retryMail, deliver } from "../src/mail.ts";
import { releaseServer, site } from "./helpers/release-server.ts";
import * as budget from "../src/mail-budget.ts";

test("paused shared-pool mail refuses admission before creating review, outbox or local reservations", async () => {
  const f = fixture();
  try {
    Object.assign(f.ctx, { mailEnabled: false });
    await assert.rejects(() => submit(f.ctx, valid, "synthetic-unreserved-team", "192.0.2.1"), /mail_paused/);
    for (const table of ["reviews", "outbox", "recovery_events", "rate_limits"])
      assert.equal(f.db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n, 0);
    assert.equal(f.mail.length, 0);
  } finally { f.db.close(); }
});
test("paused shared-pool mail preserves queued retries without consuming attempts or contacting provider", async () => {
  const f = fixture();
  try {
    f.ctx.send = async () => { throw new Error("synthetic prior delivery failure"); };
    await submit(f.ctx, valid, "synthetic-queued-before-pause", "192.0.2.2");
    const before = f.db.prepare("SELECT * FROM outbox").all();
    let calls = 0; f.ctx.send = async () => { calls++; };
    Object.assign(f.ctx, { mailEnabled: false }); const now = f.ctx.now(); f.ctx.now = () => now + 600000;
    await retryMail(f.ctx); await deliver(f.ctx, String(before[0].review_id));
    assert.equal(calls, 0);
    assert.deepEqual(f.db.prepare("SELECT * FROM outbox").all(), before);
  } finally { f.db.close(); }
});
test("actual production HTTP defaults paused without outbound Resend calls", async () => {
  const f = await releaseServer({ openSubmissions: true });
  try {
    const response = await f.call("/v1/reviews", "POST", "", { Origin: site, "Idempotency-Key": "synthetic-team-http-1" }, JSON.stringify(valid));
    assert.equal(response.status, 503);
    assert.equal(JSON.parse(response.body).error, "mail_paused");
  } finally { await f.close(); }
});

test("mail admission requires explicit true and does not pretend to reserve global shared capacity", () => {
  for (const ctx of [{}, {mailEnabled:false}]) assert.throws(() => budget.requireMailEnabled(ctx), /mail_paused/);
  assert.doesNotThrow(() => budget.requireMailEnabled({mailEnabled:true}));
});
