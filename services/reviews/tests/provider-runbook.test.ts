import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("R3 runbook complete service command enters service cwd for child CLIs", async () => {
  const doc = await readFile(new URL("../../../docs/reviews-provider-recovery.md", import.meta.url), "utf8");
  assert.ok(doc.includes("(cd services/reviews && node --experimental-strip-types --test --test-concurrency=1 tests/*.test.ts)"));
  assert.ok(!doc.includes("--test-concurrency=1 services/reviews/tests/*.test.ts"));
});
