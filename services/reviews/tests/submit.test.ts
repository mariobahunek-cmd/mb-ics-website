import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
test("submission durably persists encrypted private data and exactly one queued mail across retries", async () => {
  const { ctx, db, mail } = fixture();
  await submit(ctx, valid, "request-000000001", "127.0.0.1");
  await submit(ctx, valid, "request-000000001", "127.0.0.1");
  assert.equal(db.prepare("SELECT count(*) n FROM reviews").get()!.n, 1);
  assert.equal(mail.length, 1);
  assert.equal(
    db.prepare("SELECT status FROM reviews").get()!.status,
    "pending_email",
  );
  assert.equal(
    JSON.stringify(db.prepare("SELECT * FROM review_private").get()).includes(
      valid.email,
    ),
    false,
  );
  assert.equal(
    JSON.stringify(db.prepare("SELECT * FROM outbox").get()).includes(
      mail[0].confirm,
    ),
    false,
  );
  await assert.rejects(
    () => submit(ctx, { ...valid, stars: 1 }, "request-000000001", "127.0.0.1"),
    /idempotency/,
  );
  db.close();
});
test("provider failure remains queued, retry succeeds, rate and challenge protection fail closed", async () => {
  const { ctx, db, mail } = fixture();
  const send = ctx.send;
  ctx.send = async () => {
    throw new Error("provider unavailable");
  };
  assert.deepEqual(await submit(ctx, valid, "request-000000001", "ip"), {
    status: "pending_email",
  });
  assert.equal(db.prepare("SELECT state FROM outbox").get()!.state, "queued");
  ctx.send = send;
  await submit(ctx, valid, "request-000000001", "ip");
  assert.equal(mail.length, 1);
  ctx.challenge = async () => false;
  await assert.rejects(
    () => submit(ctx, valid, "request-000000002", "ip"),
    /challenge/,
  );
  ctx.challenge = async () => true;
  for (let n = 0; n < 57; n++)
    await submit(ctx, valid, "request-000000001", "ip");
  await assert.rejects(
    () => submit(ctx, valid, "request-000000001", "ip"),
    /rate_limit/,
  );
  assert.equal(db.prepare("SELECT count(*) n FROM reviews").get()!.n, 1);
  db.close();
});
test("concurrent retries of one idempotency key succeed without duplicate review or mail", async () => {
  const { ctx, db, mail } = fixture();
  const results = await Promise.allSettled(
    Array.from({ length: 3 }, () =>
      submit(ctx, valid, "concurrent-00000001", "ip"),
    ),
  );
  assert.deepEqual(
    results.map((r) => r.status),
    ["fulfilled", "fulfilled", "fulfilled"],
  );
  assert.equal(db.prepare("SELECT count(*) n FROM reviews").get()!.n, 1);
  assert.equal(mail.length, 1);
  db.close();
});
test("idempotent client retries cannot send expired confirmation mail or exceed outbox retry ceiling", async () => {
  const { ctx, db } = fixture();
  let attempts = 0;
  ctx.send = async () => {
    attempts++;
    throw new Error("synthetic outage");
  };
  await submit(ctx, valid, "expired-mail-00001", "ip");
  assert.equal(attempts, 1);
  db.prepare("UPDATE review_private SET token_expiry=?").run(ctx.now() - 1);
  await submit(ctx, valid, "expired-mail-00001", "ip");
  assert.equal(attempts, 1);
  db.prepare("UPDATE review_private SET token_expiry=?").run(
    ctx.now() + 86400000,
  );
  db.prepare("UPDATE outbox SET attempts=12").run();
  await submit(ctx, valid, "expired-mail-00001", "ip");
  assert.equal(attempts, 1);
  db.close();
});
