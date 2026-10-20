import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
import { withdraw, cleanup } from "../src/lifecycle.ts";
import { digest } from "../src/crypto.ts";
test("author withdrawal erases private and public text atomically; retention deletes unconfirmed data", async () => {
  const { ctx, db, mail } = fixture();
  await submit(
    ctx,
    { ...valid, comment: "Private synthetic comment" },
    "request-000000001",
    "ip",
  );
  const token = new URLSearchParams(new URL(mail[0].manage).hash.slice(1)).get(
    "manage",
  )!;
  assert.throws(() => withdraw(ctx, "wrong"), /invalid_token/);
  withdraw(ctx, token);
  assert.equal(
    db.prepare("SELECT status FROM reviews").get()!.status,
    "withdrawn",
  );
  assert.equal(
    db.prepare("SELECT comment_plaintext FROM reviews").get()!
      .comment_plaintext,
    "",
  );
  for (const table of ["review_private", "outbox", "idempotency"])
    assert.equal(db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n, 0);
  assert.throws(() => withdraw(ctx, token), /invalid_token/);
  await submit(
    ctx,
    { ...valid, email: "second@example.invalid" },
    "request-000000002",
    "ip",
  );
  ctx.now = () => Date.UTC(2026, 9, 25);
  cleanup(ctx);
  assert.equal(
    db
      .prepare("SELECT count(*) n FROM reviews WHERE status='pending_email'")
      .get()!.n,
    0,
  );
  // All peer/mailbox counters have expired. Only the anonymous global cost
  // reservation remains until the actual calendar billing boundary.
  const rows = db.prepare("SELECT key,count,expires_at FROM rate_limits").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].key, digest(ctx.key, "mail-budget-month:2026-10"));
  assert.equal(rows[0].count, 2);
  assert.equal(rows[0].expires_at, Date.UTC(2026, 10, 1));
  ctx.now = () => Date.UTC(2026, 10, 1);
  cleanup(ctx);
  assert.equal(db.prepare("SELECT count(*) n FROM rate_limits").get()!.n, 0);
  db.close();
});
