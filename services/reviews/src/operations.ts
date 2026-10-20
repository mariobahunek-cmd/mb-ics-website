import { backup, DatabaseSync } from "node:sqlite";
import { chmod, copyFile, access, writeFile, open } from "node:fs/promises";
import { dirname } from "node:path";
import { constants } from "node:fs";
import type { Context } from "./context.ts";
import type { Actor } from "./admin.ts";
import { authorize } from "./admin.ts";
export { localRecoveryJournal, recoveryHead, syncRecovery, reconcileRecovery } from "./recovery.ts";
export async function backupDatabase(db: DatabaseSync, path: string) {
  try {
    await access(path);
    throw new Error("Backup destination exists");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  // Reserve the destination privately before SQLite writes any data.
  await writeFile(path, "", { mode: 0o600, flag: "wx" });
  await backup(db, path);
  await chmod(path, 0o600);
}
export async function restoreDatabase(source: string, destination: string) {
  try {
    await access(destination);
    throw new Error("Restore destination exists");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const check = new DatabaseSync(source, { readOnly: true });
  try {
    if (
      check.prepare("PRAGMA integrity_check").get()!.integrity_check !== "ok" ||
      check.prepare("PRAGMA foreign_key_check").all().length
    )
      throw new Error("Backup integrity failed");
  } finally {
    check.close();
  }
  await writeFile(
    destination + ".restore-pending",
    "Reapply post-backup privacy changes and retention before serving. See operations guide.\n",
    { mode: 0o600, flag: "wx" },
  );
  // Persist the guard before the database can exist at its serving path.
  for (const path of [destination + ".restore-pending", dirname(destination)]) {
    const handle = await open(path, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  }
  await copyFile(source, destination, constants.COPYFILE_EXCL);
  await chmod(destination, 0o600);
}
export function exportOwner(ctx: Pick<Context, "db">, actor: Actor | null) {
  authorize(actor);
  return {
    version: 1,
    reviews: ctx.db.prepare("SELECT * FROM reviews ORDER BY id").all(),
    historical: ctx.db
      .prepare("SELECT * FROM historical ORDER BY source_id")
      .all(),
    historical_provenance: ctx.db.prepare("SELECT * FROM historical_provenance ORDER BY source_id").all(),
    historical_identity: ctx.db.prepare("SELECT * FROM historical_identity ORDER BY source_id").all(),
    historical_moderation: ctx.db.prepare("SELECT * FROM historical_moderation ORDER BY source_id").all(),
    audit: ctx.db.prepare("SELECT * FROM audit ORDER BY id").all(),
  };
}
