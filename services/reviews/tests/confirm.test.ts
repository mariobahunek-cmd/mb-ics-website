import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
import { confirm } from "../src/confirm.ts";
test("confirmation atomically consumes an unexpired token once and only queues moderation", async () => {
  const { ctx, db, mail } = fixture();
  await submit(ctx, valid, "request-000000001", "ip");
  const token = new URLSearchParams(new URL(mail[0].confirm).hash.slice(1)).get(
    "confirm",
  )!;
  assert.equal(confirm(ctx, token).status, "pending_moderation");
  assert.throws(() => confirm(ctx, token), /invalid_token/);
  assert.equal(
    db.prepare("SELECT status FROM reviews").get()!.status,
    "pending_moderation",
  );
  await submit(
    ctx,
    { ...valid, email: "other@example.invalid" },
    "request-000000002",
    "ip",
  );
  ctx.now = () => Date.UTC(2026, 9, 11);
  const expired = new URLSearchParams(
    new URL(mail[1].confirm).hash.slice(1),
  ).get("confirm")!;
  assert.throws(() => confirm(ctx, expired), /invalid_token/);
  db.close();
});
