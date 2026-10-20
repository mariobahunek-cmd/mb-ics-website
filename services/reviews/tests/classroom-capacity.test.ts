import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";

test("classroom: 30 participants sharing one trusted address can submit and retry without automatic publication", async () => {
  const { ctx, db, mail } = fixture();
  try {
    const participants = Array.from({ length: 30 }, (_, n) => ({
      body: { ...valid, email: `classroom-${n}@example.invalid`, stars: n % 5 + 1 },
      id: `classroom-request-${String(n).padStart(3, "0")}`,
    }));
    for (const p of participants) {
      assert.deepEqual(await submit(ctx, p.body, p.id, "198.51.100.7"), { status: "pending_email" });
    }
    for (const p of participants) {
      assert.deepEqual(await submit(ctx, p.body, p.id, "198.51.100.7"), { status: "pending_email" });
    }
    assert.equal(db.prepare("SELECT count(*) n FROM reviews").get()!.n, 30);
    assert.equal(mail.length, 30);
    assert.equal(db.prepare("SELECT count(*) n FROM reviews WHERE status!='pending_email'").get()!.n, 0);
    await assert.rejects(() => submit(ctx, { ...valid, email: "overflow@example.invalid" }, "classroom-overflow-001", "198.51.100.7"), /rate_limit/);
    assert.equal(mail.length, 30);
    assert.equal(db.prepare("SELECT count(*) n FROM reviews").get()!.n, 30);
  } finally { db.close(); }
});

test("classroom capacity preserves three-mails-per-mailbox daily ceiling and failed challenge denial", async () => {
  const { ctx, db, mail } = fixture();
  try {
    for (let n = 0; n < 4; n++) {
      assert.deepEqual(await submit(ctx, valid, `mailbox-request-${String(n).padStart(3, "0")}`, "198.51.100.8"), { status: "pending_email" });
    }
    assert.equal(mail.length, 3);
    assert.equal(db.prepare("SELECT count(*) n FROM reviews").get()!.n, 3);
    ctx.challenge = async () => false;
    await assert.rejects(() => submit(ctx, { ...valid, email: "denied@example.invalid" }, "classroom-challenge-1", "198.51.100.8"), /challenge/);
    assert.equal(mail.length, 3);
  } finally { db.close(); }
});
