import { DatabaseSync } from "node:sqlite";
import { chmodSync, closeSync, openSync } from "node:fs";
import { transaction, openDB } from "./db.ts";
import { access, unlink, open } from "node:fs/promises";
import { dirname } from "node:path";
import { cleanup } from "./lifecycle.ts";

export interface RecoveryEvent {
  sequence: number;
  kind: "withdrawn" | "redacted" | "historical_withdrawn" | "quota";
  object_id: string;
  count: number;
  expires_at: number;
}
export interface RecoveryCut { origin: string; head: number }
export interface RecoveryJournal {
  append(origin: string, events: RecoveryEvent[]): Promise<RecoveryCut>;
  read(origin: string): Promise<RecoveryCut & { events: RecoveryEvent[] }>;
}
function validOrigin(origin: unknown): asserts origin is string {
  if (typeof origin !== "string" || !/^[a-f0-9]{32}$/.test(origin)) throw new Error("Invalid recovery origin");
}
function validateEvent(e: RecoveryEvent) {
  if (!e || !Number.isSafeInteger(e.sequence) || e.sequence < 1 ||
      !["withdrawn", "redacted", "historical_withdrawn", "quota"].includes(e.kind) ||
      typeof e.object_id !== "string" || !e.object_id.trim() || e.object_id.length > 250 ||
      !Number.isSafeInteger(e.count) || !Number.isSafeInteger(e.expires_at) ||
      (e.kind === "quota" ? (e.count < 1 || e.count > 2700 || e.expires_at <= 0) : (e.count !== 0 || e.expires_at !== 0)) ||
      (e.kind === "historical_withdrawn" && !e.object_id.startsWith("historical:")))
    throw new Error("Invalid recovery event");
}
export function canonical(e: RecoveryEvent) {
  validateEvent(e);
  return JSON.stringify([e.sequence, e.kind, e.object_id, e.count, e.expires_at]);
}
export function recoveryHead(db: DatabaseSync): RecoveryCut {
  const state = db.prepare("SELECT origin FROM recovery_state WHERE singleton=1").get()!;
  return { origin: String(state.origin), head: Number(db.prepare("SELECT coalesce(max(sequence),0) head FROM recovery_events").get()!.head) };
}
function events(db: DatabaseSync): RecoveryEvent[] {
  return db.prepare("SELECT sequence,kind,object_id,count,expires_at FROM recovery_events ORDER BY sequence").all() as unknown as RecoveryEvent[];
}
// Synthetic local filesystem adapter, NOT a hosted/offhost provider implementation.
export function localRecoveryJournal(path: string): RecoveryJournal & { close(): void } {
  if (path === ":memory:") throw new Error("Durable local path required");
  closeSync(openSync(path, "a", 0o600));
  chmodSync(path, 0o600);
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  db.exec("CREATE TABLE IF NOT EXISTS journal(origin TEXT NOT NULL, sequence INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(origin,sequence)) STRICT;");
  const head = (origin: string) => Number(db.prepare("SELECT coalesce(max(sequence),0) head FROM journal WHERE origin=?").get(origin)!.head);
  return {
    close: () => db.close(),
    async append(origin, batch) {
      validOrigin(origin);
      return transaction(db, () => {
        let current = head(origin);
        for (const e of batch) {
          const payload = canonical(e);
          const prior = db.prepare("SELECT payload FROM journal WHERE origin=? AND sequence=?").get(origin, e.sequence);
          if (prior) {
            if (prior.payload !== payload) throw new Error("Recovery revision conflict");
          } else {
            if (e.sequence !== current + 1) throw new Error("Recovery sequence gap");
            db.prepare("INSERT INTO journal VALUES (?,?,?)").run(origin, e.sequence, payload);
            current = e.sequence;
          }
        }
        return { origin, head: current };
      });
    },
    async read(origin) {
      validOrigin(origin);
      return transaction(db, () => {
        const rows = db.prepare("SELECT payload FROM journal WHERE origin=? ORDER BY sequence").all(origin);
        const result = rows.map(row => {
          const [sequence, kind, object_id, count, expires_at] = JSON.parse(String(row.payload));
          const e = { sequence, kind, object_id, count, expires_at } as RecoveryEvent;
          validateEvent(e);
          return e;
        });
        return { origin, head: head(origin), events: result };
      });
    },
  };
}
// expected is an independently established complete cut, NOT the journal's own stale head.
// If the source/tail has been lost and completeness is unknown, the caller must not supply a cut.
export async function reconcileRecovery(destination: string, journal: RecoveryJournal, expected: RecoveryCut, now = Date.now()) {
  await access(destination + ".restore-pending");
  if (!expected || !Number.isSafeInteger(expected.head) || expected.head < 0) throw new Error("Recovery completeness unknown");
  validOrigin(expected.origin);
  const remote = await journal.read(expected.origin);
  if (remote.origin !== expected.origin || remote.head !== expected.head || remote.events.length !== expected.head)
    throw new Error("Recovery ledger incomplete");
  remote.events.forEach((e, index) => {
    validateEvent(e);
    if (e.sequence !== index + 1) throw new Error("Recovery ledger incomplete sequence");
  });
  const db = openDB(destination);
  try {
    transaction(db, () => {
      const local = recoveryHead(db);
      if (local.origin !== expected.origin || local.head > expected.head) throw new Error("Recovery ledger incomplete origin/tail");
      const prefix = events(db);
      if (prefix.length !== local.head || prefix.some((e, index) => e.sequence !== index + 1))
        throw new Error("Recovery ledger incomplete local prefix");
      for (const e of prefix) {
        if (canonical(e) !== canonical(remote.events[e.sequence - 1])) throw new Error("Recovery revision conflict");
      }
      for (const e of remote.events) {
        if (e.sequence > local.head) {
          if (e.kind === "withdrawn" || e.kind === "redacted") {
            db.prepare("UPDATE reviews SET status='withdrawn',comment_plaintext='',display_name='',course_month=NULL WHERE id=?").run(e.object_id);
            for (const table of ["review_private", "outbox", "idempotency"])
              db.prepare(`DELETE FROM ${table} WHERE review_id=?`).run(e.object_id);
          } else if (e.kind === "historical_withdrawn") {
            const id = e.object_id.slice(11);
            if (id.startsWith("@canonical/"))
              db.prepare("UPDATE historical SET status='withdrawn',comment_plaintext='',display_name='' WHERE source_id IN (SELECT source_id FROM historical_identity WHERE canonical_id=?)").run(id.slice(11));
            else db.prepare("UPDATE historical SET status='withdrawn',comment_plaintext='',display_name='' WHERE source_id=?").run(id);
          }
          db.prepare("INSERT INTO recovery_events(sequence,kind,object_id,count,expires_at) VALUES (?,?,?,?,?)").run(e.sequence, e.kind, e.object_id, e.count, e.expires_at);
          if (e.kind !== "quota") db.prepare("INSERT INTO audit(review_id,actor,action,reason,created_at) VALUES (?,'owner-restore','recovery_erasure','restore_reconciliation',?)").run(e.object_id, now);
        }
        if (e.kind === "quota" && e.expires_at > now)
          db.prepare("INSERT INTO rate_limits(key,count,expires_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET count=max(count,excluded.count),expires_at=max(expires_at,excluded.expires_at)").run(e.object_id, e.count, e.expires_at);
      }
      // Backup mail delivery state can be stale beyond the provider idempotency horizon.
      // Quarantine by deleting payloads: never automatically replay restored mail.
      db.exec("DELETE FROM outbox");
      db.prepare("UPDATE recovery_state SET acknowledged=? WHERE singleton=1").run(expected.head);
    });
    cleanup({ db, now: () => now, key: Buffer.alloc(32), site: "", send: async () => {}, challenge: async () => false });
    // Persist all SQLite data before removing the already-durable serving guard.
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    const file = await open(destination, "r");
    try { await file.sync(); } finally { await file.close(); }
    await unlink(destination + ".restore-pending");
    const directory = await open(dirname(destination), "r");
    try { await directory.sync(); } finally { await directory.close(); }
  } finally { db.close(); }
}
export async function syncRecovery(db: DatabaseSync, journal: RecoveryJournal) {
  // Snapshot is selected before the async boundary; later controls stay pending.
  const { cut, pending } = transaction(db, () => ({ cut: recoveryHead(db), pending: events(db) }));
  const receipt = await journal.append(cut.origin, pending);
  if (receipt.origin !== cut.origin || receipt.head !== cut.head) throw new Error("Invalid recovery acknowledgement");
  db.prepare("UPDATE recovery_state SET acknowledged=max(acknowledged,?) WHERE singleton=1 AND origin=?").run(cut.head, cut.origin);
  return cut;
}
