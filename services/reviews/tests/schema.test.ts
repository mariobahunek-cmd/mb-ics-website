import { test } from "node:test";
import assert from "node:assert/strict";
import { validateReview, publicDTO } from "../src/schema.ts";
import { openDB } from "../src/db.ts";
export const valid = {
  stars: 5,
  comment: "",
  display_name: "",
  visibility_choice: "anonymous",
  course_category: "MM",
  course_month: "",
  original_language: "en",
  email: "synthetic@example.invalid",
  consent: true,
  consent_version: "2026-10-09",
  website: "",
};
test("schema rejects invalid ratings, consent and text; private data never enters DTO", () => {
  for (const stars of [0, 6, 2.5, NaN])
    assert.throws(() => validateReview({ ...valid, stars }));
  for (const patch of [
    { consent: false },
    { comment: "a".repeat(3001) },
    { display_name: "", visibility_choice: "named" },
    { email: "bad" },
    { original_language: "fr" },
    { course_month: "2026-13" },
  ])
    assert.throws(() => validateReview({ ...valid, ...patch }));
  assert.equal(validateReview(valid).stars, 5);
  const dto = publicDTO({
    ...valid,
    id: "x",
    email: "private",
    token_digest: "secret",
    status: "published",
  });
  assert.equal("email" in dto, false);
  assert.equal("token_digest" in dto, false);
  assert.equal(dto.display_name, null);
});
test("real SQLite constraints enforce integral rating and valid state", () => {
  const db = openDB(":memory:");
  for (const n of [0, 6, 2.5])
    assert.throws(() =>
      db
        .prepare(
          "INSERT INTO reviews(id,stars,comment_plaintext,display_name,visibility_choice,course_category,original_language,status,created_at,consent_version,consent_at) VALUES ('x',?,'','','anonymous','MM','en','pending_email',1,'v1',1)",
        )
        .run(n),
    );
  db.close();
});
test("schema accepts optional empty comment but rejects missing required strings, invalid state and unsupported scales", () => {
  for (const patch of [
    { comment: null },
    { comment: undefined },
    { visibility_choice: "public" },
    { course_category: "EXAM" },
    { consent_version: "old" },
    { email: "synthetic@example.invalid\nBcc:x@y.invalid" },
    { course_month: "2100-01" },
  ])
    assert.throws(() => validateReview({ ...valid, ...patch }));
  const db = openDB(":memory:");
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO reviews(id,stars,comment_plaintext,display_name,visibility_choice,course_category,original_language,status,created_at,consent_version,consent_at) VALUES ('bad',5,'','','anonymous','MM','en','approved',1,'v1',1)",
      )
      .run(),
  );
  db.close();
});
