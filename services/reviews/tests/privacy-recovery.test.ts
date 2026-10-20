import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
import { confirm } from "../src/confirm.ts";
import { moderate, redact, withdrawHistorical } from "../src/admin.ts";
import * as operations from "../src/operations.ts";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDB } from "../src/db.ts";
import { publicList } from "../src/public.ts";
import { applyImport, planImport } from "../scripts/import-authorized-reviews.ts";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import fsPromises from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
const actor = { sub: "synthetic-owner", role: "moderator" as const };
async function published(f: ReturnType<typeof fixture>, n: number) {
  await submit(f.ctx, { ...valid, comment: "Synthetic PRIVATE text", email: `synthetic-${n}@example.invalid` }, `synthetic-request-${n}`, `192.0.2.${n}`);
  confirm(f.ctx, new URLSearchParams(new URL(f.mail.at(-1)!.confirm).hash.slice(1)).get("confirm"));
  const id = String(f.db.prepare("SELECT id FROM reviews ORDER BY rowid DESC LIMIT 1").get()!.id);
  moderate(f.ctx, actor, id, "published", "reviewed");
  return id;
}
test("post-backup withdrawal and redaction have atomic durable exact-ID journal revisions without removed content", async () => {
  const f = fixture();
  try {
    const id = await published(f, 1);
    redact(f.ctx, actor, id, "PRIVATE");
    moderate(f.ctx, actor, id, "withdrawn", "author_request");
    const events = f.db.prepare("SELECT sequence,kind,object_id FROM recovery_events WHERE kind!='quota' ORDER BY sequence").all();
    assert.equal(events.length, 2);
    assert.deepEqual(events.map(e => [e.kind, e.object_id]), [["redacted", id], ["withdrawn", id]]);
    assert.ok(Number(events[1].sequence) > Number(events[0].sequence));
    assert.ok(!JSON.stringify(f.db.prepare("SELECT * FROM recovery_events").all()).includes("PRIVATE"));
  } finally { f.db.close(); }
});
test("quota journal preserves both absolute reservation floors and provider-failure retry reuses them", async () => {
  const f = fixture();
  try {
    f.ctx.send = async () => { throw new Error("synthetic provider failure"); };
    await submit(f.ctx, valid, "synthetic-failed-send", "192.0.2.90");
    const before = f.db.prepare("SELECT * FROM recovery_events WHERE kind='quota' ORDER BY sequence").all();
    assert.equal(before.length, 2, "day/month reservation recovery intent missing");
    assert.deepEqual(before.map(e => e.count), [1, 1]);
    const counters = f.db.prepare("SELECT key,count FROM rate_limits WHERE key IN (SELECT object_id FROM recovery_events WHERE kind='quota') ORDER BY key").all();
    await submit(f.ctx, valid, "synthetic-failed-send", "192.0.2.90");
    assert.deepEqual(f.db.prepare("SELECT * FROM recovery_events WHERE kind='quota' ORDER BY sequence").all(), before);
    assert.deepEqual(f.db.prepare("SELECT key,count FROM rate_limits WHERE key IN (SELECT object_id FROM recovery_events WHERE kind='quota') ORDER BY key").all(), counters);
  } finally { f.db.close(); }
});
test("accepted-but-ack-lost retries exact revisions after reopening the real local adapter", async () => {
  const api = operations;
  assert.equal(typeof api.localRecoveryJournal, "function", "durable local journal adapter missing");
  const f = fixture(), dir = mkdtempSync(join(tmpdir(), "journal-"));
  let adapter = api.localRecoveryJournal(join(dir, "journal.sqlite"));
  const source = join(dir, "source.sqlite");
  try {
    await operations.backupDatabase(f.db, source);
    f.db.close(); f.db = openDB(source); f.ctx.db = f.db;
    const id = await published(f, 2);
    moderate(f.ctx, actor, id, "withdrawn", "author_request");
    const cut = api.recoveryHead(f.db);
    const lost = { ...adapter, append: async (origin: string, events: import("../src/recovery.ts").RecoveryEvent[]) => { await adapter.append(origin, events); throw new Error("synthetic accepted ACK lost"); } };
    await assert.rejects(() => api.syncRecovery(f.db, lost), /ACK lost/);
    assert.equal(f.db.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged, 0);
    adapter.close(); f.db.close();
    // A new client process retries from the durable source intent, not retained JS state.
    const retry = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/operations.ts", "journal-sync-local", source, join(dir,"journal.sqlite")], { encoding: "utf8" });
    assert.equal(retry.status, 0, retry.stderr);
    f.db = openDB(source); f.ctx.db = f.db;
    adapter = api.localRecoveryJournal(join(dir, "journal.sqlite"));
    assert.equal(f.db.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged, cut.head);
    const first = await adapter.read(cut.origin);
    await api.syncRecovery(f.db, adapter);
    assert.deepEqual(await adapter.read(cut.origin), first, "redelivery changed durable exact revisions");
    assert.equal(first.events.length, cut.head);
    const conflicting = first.events.map((e: any, n: number) => n ? e : { ...e, object_id: "different-object" });
    await assert.rejects(() => adapter.append(cut.origin, conflicting), /conflict/);
  } finally { adapter.close(); f.db.close(); rmSync(dir, { recursive: true, force: true }); }
});
test("unsafe old backup stays closed on sync gap; complete journal erases post-backup controls and restores quota floors", async () => {
  const api = operations;
  assert.equal(typeof api.reconcileRecovery, "function", "guarded durable recovery missing");
  const f = fixture(), dir = mkdtempSync(join(tmpdir(), "recovery-"));
  const adapter = api.localRecoveryJournal(join(dir, "journal.sqlite"));
  const archive = join(dir, "backup.sqlite"), destination = join(dir, "reviews.sqlite");
  try {
    const withdrawn = await published(f, 3), redacted = await published(f, 4);
    await api.syncRecovery(f.db, adapter);
    await operations.backupDatabase(f.db, archive);
    moderate(f.ctx, actor, withdrawn, "withdrawn", "author_request");
    redact(f.ctx, actor, redacted, "PRIVATE");
    await submit(f.ctx, { ...valid, email: "synthetic-post-backup@example.invalid" }, "synthetic-post-backup", "192.0.2.5");
    const cut = api.recoveryHead(f.db);
    await operations.restoreDatabase(archive, destination);
    await assert.rejects(() => api.reconcileRecovery(destination, adapter, cut, f.ctx.now()), /incomplete/);
    assert.ok(existsSync(destination + ".restore-pending"));
    const unsafe = openDB(destination);
    assert.equal(publicList({ ...f.ctx, db: unsafe }, new URLSearchParams()).summary.count, 2);
    unsafe.close();
    await api.syncRecovery(f.db, adapter);
    await api.reconcileRecovery(destination, adapter, cut, f.ctx.now());
    assert.equal(existsSync(destination + ".restore-pending"), false);
    const restored = openDB(destination);
    try {
      assert.equal(publicList({ ...f.ctx, db: restored }, new URLSearchParams()).summary.count, 0);
      for (const id of [withdrawn, redacted]) {
        assert.equal(restored.prepare("SELECT status,comment_plaintext FROM reviews WHERE id=?").get(id)!.comment_plaintext, "");
        assert.equal(restored.prepare("SELECT count(*) n FROM review_private WHERE review_id=?").get(id)!.n, 0);
      }
      assert.equal(restored.prepare("SELECT count(*) n FROM outbox").get()!.n, 0, "restored queued/sent mail must not redeliver an unknown provider outcome");
      const floor = f.db.prepare("SELECT object_id,max(count) count FROM recovery_events WHERE kind='quota' GROUP BY object_id ORDER BY object_id").all();
      assert.deepEqual(restored.prepare("SELECT key object_id,count FROM rate_limits WHERE key IN (SELECT object_id FROM recovery_events WHERE kind='quota') ORDER BY key").all(), floor);
      assert.deepEqual(api.recoveryHead(restored), cut);
      assert.equal(restored.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged, cut.head);
    } finally { restored.close(); }
  } finally { adapter.close(); f.db.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("legacy empty owner-ledger cannot bypass the durable restore guard", async () => {
  const f = fixture(), dir = mkdtempSync(join(tmpdir(), "legacy-gap-"));
  try {
    await published(f, 6);
    const archive = join(dir, "backup.sqlite"), destination = join(dir, "reviews.sqlite"), ledger = join(dir, "ledger.json");
    await operations.backupDatabase(f.db, archive);
    await operations.restoreDatabase(archive, destination);
    writeFileSync(ledger, JSON.stringify({ version: 1, withdrawals: [], redactions: [] }));
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/operations.ts", "reconcile", destination, ledger], { encoding: "utf8" });
    assert.equal(result.status, 1, "version 1 IDs alone incorrectly unblocked a potentially stale privacy/budget backup");
    assert.ok(existsSync(destination + ".restore-pending"));
  } finally { f.db.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("pending acknowledgements in backup, wrong origins, gapped revisions and unknown tails all keep restore closed", async () => {
  const f = fixture(), dir = mkdtempSync(join(tmpdir(), "pending-gap-"));
  const adapter = operations.localRecoveryJournal(join(dir, "journal.sqlite"));
  const archive = join(dir, "backup.sqlite"), destination = join(dir, "reviews.sqlite");
  try {
    const id = await published(f, 7);
    moderate(f.ctx, actor, id, "withdrawn", "author_request");
    // The online backup includes locally committed but not yet acknowledged controls.
    await operations.backupDatabase(f.db, archive);
    await operations.restoreDatabase(archive, destination);
    const cut = operations.recoveryHead(f.db);
    await assert.rejects(() => operations.reconcileRecovery(destination, adapter, cut, f.ctx.now()), /incomplete/);
    await operations.syncRecovery(f.db, adapter);
    const remote = await adapter.read(cut.origin);
    for (const bad of [
      { ...remote, origin: "0".repeat(32) },
      { ...remote, events: remote.events.slice(1) },
      { ...remote, events: remote.events.map((e, n) => n ? e : { ...e, object_id: "different-object" }) },
      { ...remote, events: remote.events.map((e, n) => n ? e : { ...e, sequence: 2 }) },
    ]) {
      await assert.rejects(() => operations.reconcileRecovery(destination, { ...adapter, read: async () => bad }, cut, f.ctx.now()));
      assert.ok(existsSync(destination + ".restore-pending"));
    }
    await assert.rejects(() => operations.reconcileRecovery(destination, adapter, undefined as any, f.ctx.now()), /unknown/);
    assert.ok(existsSync(destination + ".restore-pending"));
    await operations.reconcileRecovery(destination, adapter, cut, f.ctx.now());
    assert.equal(existsSync(destination + ".restore-pending"), false);
  } finally { adapter.close(); f.db.close(); rmSync(dir, { recursive: true, force: true }); }
});
test("privacy intent insertion failure rolls back erasure; source changes during ACK remain pending", async () => {
  const f = fixture(), dir = mkdtempSync(join(tmpdir(), "atomic-journal-"));
  const adapter = operations.localRecoveryJournal(join(dir, "journal.sqlite"));
  try {
    const id = await published(f, 8);
    f.db.exec("CREATE TRIGGER synthetic_failure BEFORE INSERT ON recovery_events WHEN NEW.kind='withdrawn' BEGIN SELECT RAISE(ABORT,'synthetic journal full'); END;");
    assert.throws(() => moderate(f.ctx, actor, id, "withdrawn", "author_request"), /synthetic journal full/);
    assert.equal(f.db.prepare("SELECT status FROM reviews WHERE id=?").get(id)!.status, "published");
    assert.equal(f.db.prepare("SELECT count(*) n FROM review_private WHERE review_id=?").get(id)!.n, 1);
    f.db.exec("DROP TRIGGER synthetic_failure");
    const cut = operations.recoveryHead(f.db);
    await operations.syncRecovery(f.db, { ...adapter, append: async (origin, events) => {
      const receipt = await adapter.append(origin, events);
      moderate(f.ctx, actor, id, "withdrawn", "author_request");
      return receipt;
    } });
    assert.equal(f.db.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged, cut.head);
    assert.equal(operations.recoveryHead(f.db).head, cut.head + 1);
    await operations.syncRecovery(f.db, adapter);
    assert.equal(f.db.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged, cut.head + 1);
  } finally { adapter.close(); f.db.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("incomplete restored local prefix cannot skip a post-backup withdrawal below its forged head", async () => {
  const f = fixture(), dir = mkdtempSync(join(tmpdir(), "local-prefix-gap-"));
  const adapter = operations.localRecoveryJournal(join(dir,"journal.sqlite"));
  try {
    const id = await published(f, 9);
    const archive=join(dir,"backup.sqlite"), destination=join(dir,"reviews.sqlite");
    await operations.backupDatabase(f.db,archive);
    moderate(f.ctx,actor,id,"withdrawn","author_request");
    await submit(f.ctx,{...valid,email:"prefix-gap@example.invalid"},"synthetic-prefix-gap","192.0.2.10");
    await operations.syncRecovery(f.db,adapter);
    const cut=operations.recoveryHead(f.db), remote=await adapter.read(cut.origin);
    await operations.restoreDatabase(archive,destination);
    const broken=openDB(destination), later=remote.events[3];
    // SQLite integrity is valid, but exact local revision 3 is absent before revision 4.
    broken.prepare("INSERT INTO recovery_events(sequence,kind,object_id,count,expires_at) VALUES (?,?,?,?,?)").run(later.sequence,later.kind,later.object_id,later.count,later.expires_at);
    broken.close();
    await assert.rejects(() => operations.reconcileRecovery(destination,adapter,cut,f.ctx.now()), /incomplete.*prefix/);
    assert.ok(existsSync(destination+".restore-pending"));
  } finally { adapter.close(); f.db.close(); rmSync(dir,{recursive:true,force:true}); }
});

test("post-backup historical withdrawal of an absent object remains a tombstone on exact-ID import replay", async () => {
  const f=fixture(), dir=mkdtempSync(join(tmpdir(),"historical-tombstone-"));
  const adapter=operations.localRecoveryJournal(join(dir,"journal.sqlite"));
  const input=[{source:"ProvenExpert",source_id:"synthetic-historical-1",source_rating:5,source_scale:5,original_date:"2026-01-01",comment_plaintext:"Synthetic historical",display_name:"",original_language:"en",permission_proof:"synthetic-reference",rights_confirmed:true}];
  const plan=planImport(input);
  try {
    const archive=join(dir,"backup.sqlite"), destination=join(dir,"reviews.sqlite");
    await operations.backupDatabase(f.db,archive);
    applyImport(f.ctx,input,plan.digest);
    withdrawHistorical(f.ctx,actor,input[0].source_id);
    await operations.syncRecovery(f.db,adapter);
    await operations.restoreDatabase(archive,destination);
    await operations.reconcileRecovery(destination,adapter,operations.recoveryHead(f.db),f.ctx.now());
    const restored=openDB(destination);
    try {
      assert.throws(() => applyImport({...f.ctx,db:restored},input,plan.digest), /withdrawn.*recovery/);
      assert.equal(restored.prepare("SELECT count(*) n FROM historical WHERE status='published'").get()!.n,0);
    } finally { restored.close(); }
  } finally { adapter.close(); f.db.close(); rmSync(dir,{recursive:true,force:true}); }
});

test("committed recovery interrupted before guard removal retries without duplicate erasure or audit", async () => {
  const f=fixture(),dir=mkdtempSync(join(tmpdir(),"reconcile-retry-"));
  const adapter=operations.localRecoveryJournal(join(dir,"journal.sqlite"));
  const original=fsPromises.unlink;
  try {
    const id=await published(f,11),archive=join(dir,"backup.sqlite"),destination=join(dir,"reviews.sqlite");
    await operations.backupDatabase(f.db,archive);
    moderate(f.ctx,actor,id,"withdrawn","author_request");
    await operations.syncRecovery(f.db,adapter);
    const cut=operations.recoveryHead(f.db);
    await operations.restoreDatabase(archive,destination);
    fsPromises.unlink=async (path) => { if (String(path).endsWith(".restore-pending")) throw new Error("synthetic guard unlink failed"); return original(path); };
    syncBuiltinESMExports();
    await assert.rejects(() => operations.reconcileRecovery(destination,adapter,cut,f.ctx.now()), /guard unlink failed/);
    assert.ok(existsSync(destination+".restore-pending"));
    fsPromises.unlink=original; syncBuiltinESMExports();
    await operations.reconcileRecovery(destination,adapter,cut,f.ctx.now());
    const restored=openDB(destination);
    try {
      assert.equal(restored.prepare("SELECT count(*) n FROM audit WHERE actor='owner-restore'").get()!.n,1);
      assert.equal(restored.prepare("SELECT status FROM reviews WHERE id=?").get(id)!.status,"withdrawn");
      assert.deepEqual(operations.recoveryHead(restored),cut);
      assert.equal(existsSync(destination+".restore-pending"),false);
    } finally { restored.close(); }
  } finally { fsPromises.unlink=original; syncBuiltinESMExports(); adapter.close(); f.db.close(); rmSync(dir,{recursive:true,force:true}); }
});
test("separate SQLite connection commits during ACK remain pending and invalid receipt never advances acknowledgement", async () => {
  const f=fixture(),dir=mkdtempSync(join(tmpdir(),"journal-connections-"));
  const adapter=operations.localRecoveryJournal(join(dir,"journal.sqlite"));
  let other: ReturnType<typeof openDB> | undefined;
  try {
    const source=join(dir,"source.sqlite"); await operations.backupDatabase(f.db,source);
    f.db.close(); f.db=openDB(source); f.ctx.db=f.db;
    const id=await published(f,12),cut=operations.recoveryHead(f.db);
    other=openDB(source);
    await assert.rejects(() => operations.syncRecovery(f.db,{...adapter,append:async () => ({origin:cut.origin,head:cut.head+1})}), /acknowledgement/);
    assert.equal(f.db.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged,0);
    await operations.syncRecovery(f.db,{...adapter,append:async (origin,events) => {
      const receipt=await adapter.append(origin,events);
      moderate({...f.ctx,db:other!},actor,id,"withdrawn","author_request");
      return receipt;
    }});
    assert.equal(f.db.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged,cut.head);
    assert.equal(operations.recoveryHead(f.db).head,cut.head+1);
    await operations.syncRecovery(f.db,adapter);
    assert.equal(f.db.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged,cut.head+1);
  } finally { other?.close(); adapter.close(); f.db.close(); rmSync(dir,{recursive:true,force:true}); }
});

test("source cut and exact events use one SQLite snapshot under a second-connection commit at selection boundary", async () => {
  const f=fixture(),dir=mkdtempSync(join(tmpdir(),"snapshot-boundary-"));
  const adapter=operations.localRecoveryJournal(join(dir,"journal.sqlite"));
  let other: ReturnType<typeof openDB> | undefined;
  let original: typeof f.db.prepare | undefined;
  try {
    const source=join(dir,"source.sqlite");await operations.backupDatabase(f.db,source);
    f.db.close();f.db=openDB(source);f.ctx.db=f.db;
    const id=await published(f,13),cut=operations.recoveryHead(f.db);
    other=openDB(source);other.exec("PRAGMA busy_timeout=0");
    original=f.db.prepare.bind(f.db);
    let blocked=false,attempted=false;
    f.db.prepare=((sql: string) => {
      if (sql.startsWith("SELECT sequence,kind") && !attempted) {
        attempted=true;
        try { moderate({...f.ctx,db:other!},actor,id,"withdrawn","author_request"); }
        catch (e) { if (/locked/.test(String(e))) blocked=true; else throw e; }
      }
      return original!(sql);
    }) as typeof f.db.prepare;
    await operations.syncRecovery(f.db,{...adapter,append:async (origin,events) => {
      if (blocked) moderate({...f.ctx,db:other!},actor,id,"withdrawn","author_request");
      return adapter.append(origin,events);
    }});
    assert.ok(attempted && blocked,"independent writer was not excluded during the source snapshot");
    assert.equal(f.db.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged,cut.head);
    assert.equal(operations.recoveryHead(f.db).head,cut.head+1);
  } finally { if(original) f.db.prepare=original; other?.close();adapter.close();f.db.close();rmSync(dir,{recursive:true,force:true}); }
});
