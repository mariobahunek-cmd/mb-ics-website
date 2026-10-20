import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDB } from "../src/db.ts";
import {
  backupDatabase,
  exportOwner,
  restoreDatabase,
} from "../src/operations.ts";
import { submit } from "../src/submit.ts";
import { fixture, valid } from "./helpers/fixture.ts";
test("private backup restores real SQLite state and owner export excludes reusable secrets and cleartext email", async () => {
  const dir = mkdtempSync(join(tmpdir(), "reviews-synthetic-"));
  const { ctx, db } = fixture();
  try {
    await submit(ctx, valid, "backup-00000000001", "ip");
    const archive = join(dir, "backup.sqlite"),
      restored = join(dir, "restored.sqlite");
    await backupDatabase(db, archive);
    await restoreDatabase(archive, restored);
    const reopened = openDB(restored);
    assert.equal(
      reopened.prepare("SELECT count(*) n FROM reviews").get()!.n,
      1,
    );
    assert.equal(
      reopened.prepare("PRAGMA integrity_check").get()!.integrity_check,
      "ok",
    );
    reopened.close();
    const data = exportOwner(ctx, {
      sub: "synthetic-owner",
      role: "moderator",
    });
    assert.equal(data.reviews.length, 1);
    assert.equal(JSON.stringify(data).includes(valid.email), false);
    assert.equal(JSON.stringify(data).includes("token_digest"), false);
    assert.throws(() => exportOwner(ctx, null), /unauthorized/);
    await assert.rejects(() => restoreDatabase(archive, restored), /exists/);
    assert.ok(readFileSync(archive).length > 0);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
