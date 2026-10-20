import { probeBackup } from "../src/backup-operations.ts";
import { isAbsolute } from "node:path";
try {
  const [directory,...extra] = process.argv.slice(2);
  if (!directory || !isAbsolute(directory) || extra.length) throw new Error("Private absolute directory required");
  const status = probeBackup(directory);
  console.log(JSON.stringify(status));
  process.exitCode = status.admitted ? 0 : 1;
} catch {
  console.error("Backup watchdog unavailable; admission must remain closed. No private contents logged.");
  process.exitCode = 2;
}
