import { DatabaseSync } from "node:sqlite";
import { readFileSync, chmodSync } from "node:fs";
export function openDB(path: string) {
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA secure_delete=ON;",
  );
  db.exec(
    readFileSync(
      new URL("../migrations/0001_reviews.sql", import.meta.url),
      "utf8",
    ),
  );
  db.exec(
    readFileSync(
      new URL("../migrations/0002_publication_revisions.sql", import.meta.url),
      "utf8",
    ),
  );
  db.exec(readFileSync(new URL("../migrations/0003_recovery_journal.sql", import.meta.url), "utf8"));
  try {
    transaction(db, () => {
      db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY) STRICT;");
      if (!db.prepare("SELECT version FROM schema_migrations WHERE version=4").get())
        db.exec(readFileSync(new URL("../migrations/0004_historical_sources.sql", import.meta.url), "utf8"));
      if (!db.prepare("SELECT version FROM schema_migrations WHERE version=5").get())
        db.exec(readFileSync(new URL("../migrations/0005_canonical_identity.sql", import.meta.url), "utf8"));
      if (!db.prepare("SELECT version FROM schema_migrations WHERE version=6").get())
        db.exec(readFileSync(new URL("../migrations/0006_historical_moderation.sql", import.meta.url), "utf8"));
    });
  } catch (error) {
    db.close();
    throw error;
  }
  if (path !== ":memory:") chmodSync(path, 0o600);
  return db;
}
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
