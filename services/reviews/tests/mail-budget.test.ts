import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";

test("mail budget: reserve at most 90 new confirmation emails per UTC day; retries do not spend extra capacity", async () => {
  const { ctx, db, mail } = fixture();
  try {
    for (let n = 0; n < 90; n++) {
      const body = { ...valid, email: `budget-day-${n}@example.invalid` };
      const id = `budget-day-request-${n}`;
      assert.deepEqual(await submit(ctx, body, id, `198.51.100.${n + 1}`), { status: "pending_email" });
      assert.deepEqual(await submit(ctx, body, id, `198.51.100.${n + 1}`), { status: "pending_email" });
    }
    assert.equal(mail.length, 90);
    await assert.rejects(() => submit(ctx, { ...valid, email: "budget-day-overflow@example.invalid" }, "budget-day-overflow-001", "203.0.113.1"), (e: any) => e.status === 503 && e.message === "mail_capacity");
    assert.equal(mail.length, 90);
    assert.equal(db.prepare("SELECT count(*) n FROM reviews").get()!.n, 90);
    const prior = ctx.now();
    ctx.now = () => prior + 86400_000;
    assert.deepEqual(await submit(ctx, { ...valid, email: "budget-next-day@example.invalid" }, "budget-next-day-request", "203.0.113.1"), { status: "pending_email" });
    assert.equal(mail.length, 91);
  } finally { db.close(); }
});

test("mail budget: cap the actual UTC calendar month at 2700 even across 31 days; reset only on next month", async () => {
  const { ctx, db, mail } = fixture();
  try {
    for (let day = 1; day <= 30; day++) {
      ctx.now = () => Date.UTC(2026, 9, day, 12);
      for (let n = 0; n < 90; n++) {
        await submit(ctx, { ...valid, email: `month-${day}-${n}@example.invalid` }, `budget-month-${day}-${String(n).padStart(3, "0")}`, `192.0.2.${n + 1}`);
      }
    }
    assert.equal(mail.length, 2700);
    ctx.now = () => Date.UTC(2026, 9, 31, 12);
    await assert.rejects(() => submit(ctx, { ...valid, email: "month-overflow@example.invalid" }, "budget-month-overflow", "203.0.113.1"), (e: any) => e.status === 503 && e.message === "mail_capacity");
    assert.equal(mail.length, 2700);
    assert.equal(db.prepare("SELECT count(*) n FROM reviews").get()!.n, 2700);
    ctx.now = () => Date.UTC(2026, 10, 1);
    assert.deepEqual(await submit(ctx, { ...valid, email: "month-overflow@example.invalid" }, "budget-month-overflow", "203.0.113.1"), { status: "pending_email" });
    assert.equal(mail.length, 2701);
  } finally { db.close(); }
});

test("mail budget: concurrent last-slot submissions reserve once with review/outbox; denied attempts cannot persist", async () => {
  const { ctx, db, mail } = fixture();
  try {
    for (let n = 0; n < 89; n++) {
      await submit(ctx, { ...valid, email: `reserve-${n}@example.invalid` }, `reserve-request-${String(n).padStart(3, "0")}`, `192.0.2.${n + 1}`);
    }
    const results = await Promise.allSettled(Array.from({ length: 3 }, (_, n) => submit(ctx, { ...valid, email: `last-slot-${n}@example.invalid` }, `last-slot-request-${n}`, "203.0.113.1")));
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(results.filter(r => r.status === "rejected").length, 2);
    for (const r of results) if (r.status === "rejected") {
      assert.equal(r.reason.status, 503);
      assert.equal(r.reason.message, "mail_capacity");
    }
    assert.equal(mail.length, 90);
    for (const table of ["reviews", "review_private", "idempotency", "outbox"]) {
      assert.equal(db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n, 90);
    }
  } finally { db.close(); }
});
