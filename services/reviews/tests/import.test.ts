import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/fixture.ts";
import {
  planImport,
  applyImport,
} from "../scripts/import-authorized-reviews.ts";
import { summary } from "../src/public.ts";
test("authorized import is dry-run first, preserves decimals and provenance, and is idempotent", () => {
  const { ctx, db } = fixture();
  const rows = [
    {
      source: "ProvenExpert",
      source_id: "synthetic-historical-1",
      source_rating: 4.8,
      source_scale: 5,
      original_date: "2020-02-29",
      comment_plaintext: "Synthetic historical test only",
      display_name: "Synthetic",
      original_language: "de",
      permission_proof: "synthetic-consent-record",
      rights_confirmed: true,
    },
  ];
  const plan = planImport(rows);
  assert.equal(db.prepare("SELECT count(*) n FROM historical").get()!.n, 0);
  assert.throws(() => applyImport(ctx, rows, "wrong"), /approval/);
  applyImport(ctx, rows, plan.digest);
  applyImport(ctx, rows, plan.digest);
  assert.equal(db.prepare("SELECT count(*) n FROM historical").get()!.n, 1);
  assert.equal(
    db.prepare("SELECT source_rating FROM historical").get()!.source_rating,
    4.8,
  );
  assert.equal(summary(ctx).count, 0);
  for (const patch of [
    { rights_confirmed: false },
    { permission_proof: "" },
    { source_scale: 0 },
    { source_rating: 6 },
    { original_date: "2020-02-30" },
    { source: "LinkedIn" },
  ])
    assert.throws(() => planImport([{ ...rows[0], ...patch }]), /row/);
  assert.throws(() => planImport([...rows, ...rows]), /duplicate/i);
  const changed = [{ ...rows[0], source_rating: 4.6 }];
  assert.throws(
    () => applyImport(ctx, changed, planImport(changed).digest),
    /conflict/,
  );
  db.close();
});
