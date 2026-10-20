import { tmpdir } from "node:os";
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import fsPromises from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
import { confirm } from "../src/confirm.ts";
import { moderate, redact } from "../src/admin.ts";
import { publicList, summary } from "../src/public.ts";
import { backupDatabase, restoreDatabase, localRecoveryJournal, recoveryHead, syncRecovery } from "../src/operations.ts";
import { openDB } from "../src/db.ts";
const actor = {
  sub: "synthetic-security-reviewer",
  role: "moderator" as const,
};
const evidence = tmpdir();
async function publish(
  f: any,
  n: number,
  stars = 5,
  comment = "Synthetic review",
) {
  await submit(
    f.ctx,
    { ...valid, stars, comment, email: `probe-${n}@example.invalid` },
    `security-probe-${String(n).padStart(8, "0")}`,
    "synthetic-ip",
  );
  const mail = f.mail.at(-1);
  confirm(
    f.ctx,
    new URLSearchParams(new URL(mail.confirm).hash.slice(1)).get("confirm"),
  );
  const id = String(
    f.db.prepare("SELECT id FROM reviews ORDER BY rowid DESC LIMIT 1").get().id,
  );
  moderate(f.ctx, actor, id, "published", "reviewed");
  return id;
}
test("SECURITY INVARIANT: marker-write failure during restore leaves no unguarded serving database", async () => {
  const f = fixture(),
    dir = mkdtempSync(join(evidence, "restore-failure-"));
  const originalWrite = fsPromises.writeFile;
  try {
    await publish(f, 20);
    const archive = join(dir, "archive.sqlite"),
      restored = join(dir, "reviews.sqlite");
    await backupDatabase(f.db, archive);
    fsPromises.writeFile = async function (path: any, ...args: any[]) {
      if (String(path).endsWith(".restore-pending"))
        throw Object.assign(new Error("SYNTHETIC injected disk failure"), {
          code: "ENOSPC",
        });
      return (originalWrite as any)(path, ...args);
    } as any;
    syncBuiltinESMExports();
    await assert.rejects(() => restoreDatabase(archive, restored), /SYNTHETIC/);
    console.log(
      JSON.stringify({
        probe: "restore_interruption",
        database_exists: existsSync(restored),
        restore_marker_present: existsSync(restored + ".restore-pending"),
      }),
    );
    assert.ok(
      !existsSync(restored) || existsSync(restored + ".restore-pending"),
      "Restore left DB ready for server startup without reconciliation",
    );
  } finally {
    fsPromises.writeFile = originalWrite;
    syncBuiltinESMExports();
    f.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("restore reconciliation rejects a withdrawal-only ledger and erases post-backup redactions before unblocking", async () => {
  const f = fixture(),
    dir = mkdtempSync(join(evidence, "restore-privacy-"));
  try {
    const id = await publish(
      f,
      10,
      1,
      "Critical feedback. synthetic-private@example.invalid",
    );
    const archive = join(dir, "archive.sqlite"),
      restored = join(dir, "reviews.sqlite"),
      ledger = join(dir, "privacy.json");
    await backupDatabase(f.db, archive);
    redact(f.ctx, actor, id, "synthetic-private@example.invalid");
    await restoreDatabase(archive, restored);
    const cli = () =>
      spawnSync(
        process.execPath,
        [
          "--experimental-strip-types",
          resolve(import.meta.dirname, "../scripts/operations.ts"),
          "reconcile",
          restored,
          ledger,
        ],
        { encoding: "utf8" },
      );
    writeFileSync(ledger, "[]", { mode: 0o600 });
    assert.equal(
      cli().status,
      1,
      "Legacy withdrawal-only ledger must not unlock a restored database",
    );
    assert.ok(existsSync(restored + ".restore-pending"));
    writeFileSync(
      ledger,
      JSON.stringify({ version: 1, withdrawals: [], redactions: [id] }),
    );
    assert.equal(cli().status, 1, "ID-only ledger must not bypass quota/completeness reconciliation");
    assert.ok(existsSync(restored + ".restore-pending"));
    const journalPath = join(dir, "journal.sqlite");
    const journal = localRecoveryJournal(journalPath);
    try { await syncRecovery(f.db, journal); } finally { journal.close(); }
    writeFileSync(ledger, JSON.stringify({ version: 2, localJournal: journalPath, expected: recoveryHead(f.db) }));
    const run = cli();
    assert.equal(run.status, 0, run.stderr);
    assert.equal(existsSync(restored + ".restore-pending"), false);
    const reopened = openDB(restored);
    try {
      assert.equal(
        publicList({ ...f.ctx, db: reopened }, new URLSearchParams()).summary
          .count,
        0,
      );
      assert.equal(
        reopened
          .prepare("SELECT comment_plaintext FROM reviews WHERE id=?")
          .get(id)!.comment_plaintext,
        "",
      );
      assert.equal(
        reopened
          .prepare("SELECT count(*) n FROM review_private WHERE review_id=?")
          .get(id)!.n,
        0,
      );
      assert.equal(
        reopened
          .prepare(
            "SELECT count(*) n FROM audit WHERE review_id=? AND actor='owner-restore'",
          )
          .get(id)!.n,
        1,
      );
    } finally {
      reopened.close();
    }
  } finally {
    f.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("SECURITY INVARIANT: signed cursor list and summary retain the same publication scope", async () => {
  const f = fixture();
  try {
    await publish(f, 1, 5);
    await publish(f, 2, 5);
    const first = publicList(f.ctx, new URLSearchParams("limit=1"));
    const old = f.ctx.now();
    f.ctx.now = () => old + 1000;
    await publish(f, 3, 1);
    const second = publicList(
      f.ctx,
      new URLSearchParams({ limit: "1", cursor: first.next_cursor! }),
    );
    console.log(
      JSON.stringify({
        probe: "snapshot",
        accessible_reviews: first.items.length + second.items.length,
        next_cursor: second.next_cursor,
        reported_count: second.summary.count,
        reported_mean: second.summary.mean,
        expected_snapshot_mean: 5,
      }),
    );
    assert.equal(
      second.summary.count,
      2,
      "Cursor excludes new publication but summary counts it",
    );
  } finally {
    f.db.close();
  }
});
test("both pagination sorts exclude later publications from every aggregate and immediately exclude withdrawals", async () => {
  for (const sort of ["newest", "critical"]) {
    const f = fixture();
    try {
      const withdrawn = await publish(f, 101, 1);
      await publish(f, 102, 5);
      await publish(f, 103, 3);
      const first = publicList(
        f.ctx,
        new URLSearchParams({ sort, limit: "1" }),
      );
      const before = f.ctx.now();
      f.ctx.now = () => before + 1000;
      await publish(f, 104, 5);
      moderate(f.ctx, actor, withdrawn, "withdrawn", "author_request");
      const next = publicList(
        f.ctx,
        new URLSearchParams({ sort, limit: "1", cursor: first.next_cursor! }),
      );
      assert.deepEqual(next.summary, {
        count: 2,
        mean: 4,
        distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 },
      });
      assert.ok(next.items.every((row) => row.id !== withdrawn));
      assert.equal(summary(f.ctx).count, 3);
    } finally {
      f.db.close();
    }
  }
});
test("copy failure after guard creation leaves the restore blocked", async () => {
  const f = fixture(),
    dir = mkdtempSync(join(evidence, "restore-copy-failure-"));
  const originalCopy = fsPromises.copyFile;
  try {
    const archive = join(dir, "archive.sqlite"),
      restored = join(dir, "reviews.sqlite");
    await backupDatabase(f.db, archive);
    fsPromises.copyFile = (async () => {
      throw new Error("SYNTHETIC copy interrupted");
    }) as typeof fsPromises.copyFile;
    syncBuiltinESMExports();
    await assert.rejects(() => restoreDatabase(archive, restored), /SYNTHETIC/);
    assert.ok(existsSync(restored + ".restore-pending"));
  } finally {
    fsPromises.copyFile = originalCopy;
    syncBuiltinESMExports();
    f.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
