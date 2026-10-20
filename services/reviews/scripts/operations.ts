import {
  readFile,
  writeFile,
  access,
  unlink,
  readdir,
  stat,
  realpath,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { recoveryConfig, authoritativeOffhostCut, b2RecoveryStore, offlineRecoveryStore, b2RecoveryJournal, backupOffhost, restoreOffhost, reconcileOffhost } from "../src/offhost.ts";
import { recoveryBinding, boundRecoveryCycle } from "../src/offhost-binding.ts";
import { openDB } from "../src/db.ts";
import {
  backupDatabase,
  restoreDatabase,
  exportOwner,
  localRecoveryJournal,
  recoveryHead,
  syncRecovery,
  reconcileRecovery,
} from "../src/operations.ts";
const [command, path, target] = process.argv.slice(2);
try {
  if (!path)
    throw new Error(
      "Usage: operations.ts backup|export|restore|reconcile|journal-head|journal-head-offhost|journal-sync-local|journal-sync-offhost|backup-offhost|restore-offhost|reconcile-offhost|offhost-cycle|prune-backups DB_OR_DIR TARGET",
    );
  const remoteCommands = ["journal-sync-offhost", "backup-offhost", "restore-offhost", "reconcile-offhost", "offhost-cycle"];
  const binding = remoteCommands.includes(command) ? recoveryConfig(process.env) : null;
  if (remoteCommands.includes(command) && !binding) throw new Error("Offhost provider not configured");
  const cycleBinding = command === "offhost-cycle" ? recoveryBinding(process.env) : null;
  let cycleDirectory: string | undefined;
  if (command === "offhost-cycle") {
    if (!cycleBinding || !target) throw new Error("Complete offhost cycle binding required");
    cycleDirectory = await realpath(resolve(target));
    if (cycleDirectory !== dirname(await realpath(resolve(path))))
      throw new Error("Cycle database and measured state directory must share one physical directory");
  }
  let store = binding && command !== "offhost-cycle" ? b2RecoveryStore(binding, fetch, dirname(resolve(path))) : null;
  if (store && ["restore-offhost", "reconcile-offhost"].includes(command)) {
    const identity = process.argv[5];
    store = offlineRecoveryStore(store, identity);
  } else if (process.argv[5]) throw new Error("Offline identity argument not permitted for online commands");
  if (command === "restore-offhost" || command === "reconcile-offhost") {
    if (!target) throw new Error("Offhost recovery spec required");
    const spec = JSON.parse(await readFile(target, "utf8"));
    if (spec.version !== 4 || !spec.expected) throw new Error("Independently established complete cut required");
    if (command === "restore-offhost") await restoreOffhost(store!, spec.backup, path, spec.expected, dirname(resolve(path)));
    else await reconcileOffhost(store!, path, spec.expected);
    console.log("Offhost version retrieved and privacy reconciled; restored mail quarantined. Not live acceptance.");
  } else if (command === "restore") {
    if (!target) throw new Error("A fresh destination is required");
    await restoreDatabase(path, target);
    console.log("Restored privately. Startup blocked until reconciliation.");
  } else if (command === "reconcile") {
    if (!target) throw new Error("Complete reviewed recovery cut required");
    const spec = JSON.parse(await readFile(target, "utf8"));
    if (spec.version !== 2 || typeof spec.localJournal !== "string" || !spec.localJournal || !spec.expected)
      throw new Error("Require version 2 complete journal and independently established cut");
    const journal = localRecoveryJournal(resolve(spec.localJournal));
    try { await reconcileRecovery(path, journal, spec.expected); } finally { journal.close(); }
    console.log("Local journal reapplied; restored mail quarantined; retention complete. Not offhost acceptance.");
  } else if (command === "prune-backups") {
    let removed = 0;
    for (const name of await readdir(path)) {
      if (!/^reviews-backup-[0-9T-]+\.sqlite$/.test(name)) continue;
      const file = resolve(path, name);
      if ((await stat(file)).mtimeMs < Date.now() - 30 * 86400000) {
        await unlink(file);
        removed++;
      }
    }
    console.log(JSON.stringify({ removed }));
  } else {
    if (!["journal-head", "journal-head-offhost", "journal-sync-local", "backup", "export", "journal-sync-offhost", "backup-offhost", "offhost-cycle"].includes(command)) throw new Error("Unknown operation");
    await access(path);
    const db = openDB(path);
    try {
      if (command === "journal-sync-offhost") {
        console.log(JSON.stringify(await syncRecovery(db, b2RecoveryJournal(store!, dirname(resolve(path))))));
      } else if (command === "backup-offhost") {
        if (!target) throw new Error("Private receipt destination required");
        const receipt = await backupOffhost(db, store!, dirname(resolve(target)));
        await writeFile(target, JSON.stringify(receipt), { mode: 0o600, flag: "wx" });
        console.log("Encrypted offhost backup version verified; private receipt written. Preserve independent key and complete cut separately.");
      } else if (command === "offhost-cycle") {
        if (!target) throw new Error("Private scheduler state directory required");
        await boundRecoveryCycle(db, cycleBinding!, cycleDirectory!)();
        console.log("Offhost journal cycle and due backup verified. Not independent freshness/custody acceptance.");
      } else if (command === "journal-head-offhost") {
        console.log(JSON.stringify(authoritativeOffhostCut(db)));
      } else if (command === "journal-head") {
        console.log(JSON.stringify(recoveryHead(db)));
      } else if (command === "journal-sync-local") {
        if (!target) throw new Error("Synthetic local journal path required");
        const journal = localRecoveryJournal(target);
        try { console.log(JSON.stringify(await syncRecovery(db, journal))); } finally { journal.close(); }
      } else if (command === "backup") {
        if (!target) throw new Error("Private destination required");
        await backupDatabase(db, target);
        console.log(
          "Private SQLite backup complete; preserve encryption key separately.",
        );
      } else if (command === "export") {
        if (!target) throw new Error("Private destination required");
        await writeFile(
          target,
          JSON.stringify(
            exportOwner(
              { db },
              { sub: "owner-operations-cli", role: "moderator" },
            ),
            null,
            2,
          ),
          { mode: 0o600, flag: "wx" },
        );
        console.log(
          "Owner export written privately; no email or token material included.",
        );
      } else throw new Error("Unknown operation");
    } finally {
      db.close();
    }
  }
} catch {
  console.error(
    "Operation failed. Check command, private paths, destination existence and input format. No private contents logged.",
  );
  process.exitCode = 1;
}
