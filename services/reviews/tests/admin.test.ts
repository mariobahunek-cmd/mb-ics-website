import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
import { moderate, adminList } from "../src/admin.ts";
test("only authorized moderator can publish any rating with an immutable atomic audit", async () => {
  const { ctx, db } = fixture();
  await submit(ctx, { ...valid, stars: 1 }, "request-000000001", "ip");
  const id = String(db.prepare("SELECT id FROM reviews").get()!.id);
  assert.throws(
    () => moderate(ctx, null, id, "published", "reviewed"),
    /unauthorized/,
  );
  assert.throws(() => adminList(ctx, null), /unauthorized/);
  const actor = { sub: "synthetic-moderator", role: "moderator" as const };
  assert.throws(
    () => moderate(ctx, actor, id, "published", "reviewed"),
    /transition/,
  );
  db.prepare("UPDATE reviews SET status='pending_moderation' WHERE id=?").run(
    id,
  );
  assert.throws(() => moderate(ctx, actor, id, "rejected", ""), /reason/);
  assert.throws(
    () => moderate(ctx, actor, id, "rejected", "negative"),
    /reason/,
  );
  moderate(ctx, actor, id, "published", "reviewed");
  assert.equal(
    db.prepare("SELECT status FROM reviews").get()!.status,
    "published",
  );
  assert.equal(db.prepare("SELECT count(*) n FROM audit").get()!.n, 1);
  assert.throws(
    () => db.prepare("UPDATE audit SET reason='changed'").run(),
    /immutable/,
  );
  assert.throws(() => db.prepare("DELETE FROM audit").run(), /immutable/);
  db.exec(
    "CREATE TRIGGER simulate_audit_failure BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'audit failure'); END",
  );
  assert.throws(
    () => moderate(ctx, actor, id, "withdrawn", "author_request"),
    /audit failure/,
  );
  assert.equal(
    db.prepare("SELECT status FROM reviews").get()!.status,
    "published",
  );
  db.close();
});
test("documented privacy redaction can only remove existing text and records no removed personal data in audit", async () => {
  const { redact } = await import("../src/admin.ts");
  const { ctx, db } = fixture();
  await submit(
    ctx,
    {
      ...valid,
      comment:
        "Critical feedback about training. Personal: synthetic@example.invalid",
    },
    "redaction-0000001",
    "ip",
  );
  const id = String(db.prepare("SELECT id FROM reviews").get()!.id);
  db.prepare("UPDATE reviews SET status='pending_moderation' WHERE id=?").run(
    id,
  );
  const actor = { sub: "synthetic-moderator", role: "moderator" as const };
  assert.throws(
    () => redact(ctx, null, id, "synthetic@example.invalid"),
    /unauthorized/,
  );
  assert.throws(() => redact(ctx, actor, id, "made up praise"), /redaction/);
  redact(ctx, actor, id, "synthetic@example.invalid");
  assert.match(
    String(
      db.prepare("SELECT comment_plaintext FROM reviews").get()!
        .comment_plaintext,
    ),
    /Critical feedback/,
  );
  assert.equal(
    JSON.stringify(db.prepare("SELECT * FROM audit").all()).includes(
      "synthetic@example.invalid",
    ),
    false,
  );
  assert.equal(
    db.prepare("SELECT action FROM audit").get()!.action,
    "redacted",
  );
  db.close();
});
