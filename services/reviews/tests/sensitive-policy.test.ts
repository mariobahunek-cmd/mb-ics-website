import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
import { moderate } from "../src/admin.ts";
// @ts-expect-error Browser-owned JavaScript translations have no TypeScript declaration.
import { translations } from "../../../reviews-i18n.js";
import { readFileSync } from "node:fs";

test("the unhydrated form warns against sensitive information too", () => {
  const source = readFileSync(new URL("../../../_includes/review-form.html", import.meta.url), "utf8");
  assert.match(source, /sensitive\s+information about yourself or others/i);
});

test("all participant languages explicitly prohibit own and others special-category free text without a detection guarantee", () => {
  for (const [lang, patterns] of Object.entries({
    en: [/yourself or others/i, /health/i, /religion/i, /philosophical/i, /racial/i, /political/i, /sexual/i, /ethnic/i, /trade.union/i, /genetic/i, /biometric/i],
    de: [/dich selbst oder andere/i, /Gesundheit/i, /Religion/i, /weltanschaulich/i, /rassisch/i, /politisch/i, /sexuell/i, /ethnisch/i, /Gewerkschaft/i, /genetisch/i, /biometrisch/i],
    es: [/ti ni sobre otras personas/i, /salud/i, /religión/i, /filosófic/i, /racial/i, /polític/i, /sexual/i, /étnic/i, /sindical/i, /genétic/i, /biométric/i],
  })) {
    for (const pattern of patterns) assert.match(translations[lang].commentHint, pattern);
  }
});

test("sensitive free text can be rejected for every rating with privacy-safe audit and no publication", async () => {
  const actor = { sub: "synthetic-policy-moderator", role: "moderator" as const };
  for (const stars of [1, 2, 3, 4, 5]) {
    const { ctx, db } = fixture();
    try {
      await submit(ctx, { ...valid, stars, comment: "Synthetic sensitive fixture" }, "sensitive-policy-00001", "ip");
      const id = String(db.prepare("SELECT id FROM reviews").get()!.id);
      db.prepare("UPDATE reviews SET status='pending_moderation' WHERE id=?").run(id);
      assert.throws(() => moderate(ctx, null, id, "rejected", "sensitive_personal_data"), /unauthorized/);
      moderate(ctx, actor, id, "rejected", "sensitive_personal_data");
      assert.equal(db.prepare("SELECT status FROM reviews WHERE id=?").get(id)!.status, "rejected");
      assert.equal(db.prepare("SELECT count(*) n FROM reviews WHERE status='published'").get()!.n, 0);
      assert.equal(db.prepare("SELECT reason FROM audit").get()!.reason, "sensitive_personal_data");
      assert.equal(JSON.stringify(db.prepare("SELECT * FROM audit").all()).includes("Synthetic sensitive fixture"), false);
      assert.throws(() => moderate(ctx, actor, id, "published", "reviewed"), /transition/);
      moderate(ctx, actor, id, "withdrawn", "sensitive_personal_data");
      assert.equal(db.prepare("SELECT comment_plaintext FROM reviews WHERE id=?").get(id)!.comment_plaintext, "");
      assert.equal(db.prepare("SELECT count(*) n FROM review_private WHERE review_id=?").get(id)!.n, 0);
      assert.equal(db.prepare("SELECT count(*) n FROM outbox WHERE review_id=?").get(id)!.n, 0);
    } finally { db.close(); }
  }
});
