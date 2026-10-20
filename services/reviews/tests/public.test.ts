import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
import { publicList, summary } from "../src/public.ts";
test("public list and statistics share native published scope with stable paging and withdrawal", async () => {
  const { ctx, db } = fixture();
  for (let i = 0; i < 3; i++)
    await submit(
      ctx,
      {
        ...valid,
        stars: i === 1 ? 1 : 5,
        email: `synthetic${i}@example.invalid`,
      },
      `request-00000000${i}`,
      "ip",
    );
  const ids = db
    .prepare("SELECT id FROM reviews ORDER BY rowid")
    .all()
    .map((r) => String(r.id));
  db.prepare(
    "UPDATE reviews SET status='published',published_at=? WHERE id IN (?,?)",
  ).run(ctx.now(), ids[0], ids[1]);
  db.prepare(
    "INSERT INTO historical VALUES ('old','ProvenExpert',4.8,5,'2020-01-01',1,'Historical','Initials','de','proof-reference','published')",
  ).run();
  assert.deepEqual(summary(ctx), {
    count: 2,
    mean: 3,
    distribution: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 1 },
  });
  const first = publicList(ctx, new URLSearchParams("limit=1"));
  const second = publicList(
    ctx,
    new URLSearchParams({ limit: "1", cursor: first.next_cursor! }),
  );
  assert.equal(first.items.length, 1);
  assert.notEqual(first.items[0].id, second.items[0].id);
  assert.equal(second.next_cursor, null);
  assert.equal(JSON.stringify(first).includes("email_cipher"), false);
  assert.throws(
    () => publicList(ctx, new URLSearchParams("sort=bogus")),
    /sort/,
  );
  assert.throws(
    () => publicList(ctx, new URLSearchParams("cursor=bogus")),
    /cursor/,
  );
  db.prepare("UPDATE reviews SET status='withdrawn' WHERE id=?").run(ids[0]);
  assert.equal(summary(ctx).mean, 1);
  assert.equal(publicList(ctx, new URLSearchParams()).items.length, 1);
  db.prepare("UPDATE reviews SET status='withdrawn' WHERE id=?").run(ids[1]);
  assert.equal(summary(ctx).mean, null);
  db.close();
});
test("critical-first pagination advances from low ratings to higher ratings without duplicates", async () => {
  const { ctx, db } = fixture();
  for (let i = 1; i <= 3; i++)
    await submit(
      ctx,
      { ...valid, stars: i, email: `critical${i}@example.invalid` },
      `critical-0000000${i}`,
      "ip",
    );
  db.prepare("UPDATE reviews SET status='published',published_at=?").run(
    ctx.now(),
  );
  let cursor: string | null = null;
  const stars: number[] = [];
  for (let i = 0; i < 3; i++) {
    const p = new URLSearchParams("sort=critical&limit=1");
    if (cursor) p.set("cursor", cursor);
    const page = publicList(ctx, p);
    stars.push(Number(page.items[0]?.stars));
    cursor = page.next_cursor;
  }
  assert.deepEqual(stars, [1, 2, 3]);
  assert.equal(cursor, null);
  db.close();
});
test("historical public DTO preserves authorized content/scale but never exposes internal source IDs or permission evidence", async () => {
  const { historicalList } = await import("../src/public.ts");
  const { ctx, db } = fixture();
  db.prepare(
    "INSERT INTO historical VALUES ('private-source@example.invalid','ProvenExpert',4.8,5,'2020-01-01',1,'Authorized synthetic text','Initials','de','private-permission-reference','published')",
  ).run();
  const result = historicalList(ctx, new URLSearchParams());
  const output = JSON.stringify(result);
  assert.equal(output.includes("private-source@example.invalid"), false);
  assert.equal(output.includes("private-permission-reference"), false);
  assert.equal(result.items[0].source_rating, 4.8);
  assert.equal(result.items[0].source_scale, 5);
  assert.equal(typeof result.items[0].id, "string");
  db.close();
});
