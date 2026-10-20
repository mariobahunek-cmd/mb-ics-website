import { test, after } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
import { confirm } from "../src/confirm.ts";
import { moderate } from "../src/admin.ts";
import { openDB } from "../src/db.ts";
import { backupDatabase } from "../src/operations.ts";
import { recoveryHead } from "../src/recovery.ts";
import { setTimeout as delay } from "node:timers/promises";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, access, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as api from "../src/offhost.ts";

// This transport emulates the documented HTTP boundary, not a real provider acceptance.
function provider(retentionReadable = true) {
  const files: any[] = []; let nextId = 0; let lost = false; let failRead = false;
  const policy: any = { buckets: [{ bucketId: "synthetic-bucket", bucketType: "allPrivate", fileLockConfiguration: retentionReadable ? { isClientAuthorizedToRead: true, value: { isFileLockEnabled: false } } : { isClientAuthorizedToRead: false, value: null }, lifecycleRules: [{ fileNamePrefix: "reviews/backups/", daysFromUploadingToHiding: 27, daysFromHidingToDeleting: 1 }] }] };
  const requests: { url: string; init: RequestInit }[] = [];
  const json = (v: unknown) => new Response(JSON.stringify(v), { headers: { "Content-Type": "application/json" } });
  const fetcher = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input); requests.push({ url, init });
    if (url.endsWith("b2_authorize_account")) return json({ accountId: "synthetic-account", authorizationToken: "synthetic-account-token", apiInfo: { storageApi: {
      apiUrl: "https://api001.backblazeb2.com", downloadUrl: "https://f001.backblazeb2.com",
      allowed: { buckets: [{ id: "synthetic-bucket" }], namePrefix: "reviews/", capabilities: ["listFiles", "readFiles", "writeFiles", "listBuckets", ...(retentionReadable ? ["readBucketRetentions"] : [])] },
    } } });
    if (url.endsWith("b2_list_buckets")) return json(policy);
    if (url.endsWith("b2_get_upload_url")) return json({ uploadUrl: "https://pod-001.backblaze.com/b2api/v4/b2_upload_file/synthetic-bucket/token", authorizationToken: "synthetic-upload-token" });
    if (url.includes("b2_upload_file/")) {
      const headers = new Headers(init.headers); const body = Buffer.from(init.body as Uint8Array);
      const f = { fileId: `synthetic-${nextId++}`, fileName: decodeURIComponent(headers.get("X-Bz-File-Name")!), bucketId: "synthetic-bucket", contentLength: body.length, contentSha1: headers.get("X-Bz-Content-Sha1"), action: "upload", body };
      files.unshift(f); if (lost) { lost = false; throw new Error("synthetic lost ACK"); } return json({...f,body:undefined});
    }
    if (url.includes("b2_download_file_by_id")) {
      if (failRead) return new Response("synthetic unavailable", { status: 503 });
      const id = new URL(url).searchParams.get("fileId"); const f = files.find(f => f.fileId === id);
      return f ? new Response(f.body) : new Response("missing", { status: 404 });
    }
    if (url.endsWith("b2_list_file_versions")) {
      const body = JSON.parse(String(init.body));
      return json({ files: files.filter(f => f.fileName.startsWith(body.prefix)).map(({body, ...f}) => f), nextFileName: null, nextFileId: null });
    }
    throw new Error("Unexpected synthetic HTTP operation");
  };
  return { files, policy, requests, fetcher: fetcher as typeof fetch, loseAck: () => { lost = true; }, failReads: (v: boolean) => { failRead = v; } };
}
const scratch = await mkdtemp(join(tmpdir(), "age-offhost-tests-"));
const identityFile = join(scratch, "synthetic-identity.txt");
const generated = spawnSync("age-keygen", ["-o", identityFile], { encoding: "utf8" });
assert.equal(generated.status, 0, "age-keygen fixture dependency missing");
const recipient = spawnSync("age-keygen", ["-y", identityFile], { encoding: "utf8" }).stdout.trim();
after(async () => { await rm(scratch, { recursive: true, force: true }); });
const config = { keyId: "synthetic-key-id", applicationKey: "synthetic-application-key", bucketId: "synthetic-bucket", prefix: "reviews/", recipient };
test("R1 online upload uses standard age without any decrypt-capable service key", async () => {
  const p = provider();
  const store = api.b2RecoveryStore(config, p.fetcher);
  await store.put("backups/standard.age", Buffer.from("synthetic private data"));
  assert.ok(p.files[0].body.subarray(0, 22).toString().startsWith("age-encryption.org/v1\n"));
  assert.equal("readPlaintext" in store, false);
  // Independently run the standard CLI, not the adapter's decoder.
  const decrypted = spawnSync("age", ["--decrypt", "--identity", identityFile], { input:p.files[0].body });
  assert.equal(decrypted.status, 0);
  const value = JSON.parse(decrypted.stdout.toString());
  assert.equal(value.fileName, "reviews/backups/standard.age");
  assert.equal(Buffer.from(value.data, "base64").toString(), "synthetic private data");
});
test("B2 encrypted write is acknowledged only after exact version readback; decrypt authenticates object name", async () => {
  assert.equal(typeof api.b2RecoveryStore, "function", "real B2 adapter missing");
  const p = provider(), store = api.b2RecoveryStore(config, p.fetcher);
  const plain = Buffer.from("synthetic private database bytes");
  const receipt = await store.put("backups/synthetic.enc", plain);
  assert.deepEqual(await api.offlineRecoveryStore(store, identityFile).readPlaintext!(receipt), plain);
  assert.ok(!p.files[0].body.includes(plain), "whole-file plaintext left the host");
  assert.equal(p.requests.filter(r => r.url.includes("b2_download_file_by_id")).length, 2);
  await assert.rejects(() => api.offlineRecoveryStore(store, identityFile).readPlaintext!({ ...receipt, fileName: "reviews/backups/other.enc" }));
  p.failReads(true);
  await assert.rejects(() => store.put("backups/unverified.enc", plain));
});

test("R1 journal append and restarted lost ACK use durable ciphertext witnesses, never online decrypt", async () => {
  const p = provider(), origin = "d".repeat(32);
  const event = { sequence: 1, kind: "withdrawn" as const, object_id: "synthetic-private", count: 0, expires_at: 0 };
  const directory = await mkdtemp(join(scratch, "witness-"));
  p.loseAck();
  await assert.rejects(() => api.b2RecoveryJournal(api.b2RecoveryStore(config, p.fetcher), directory).append(origin, [event]), /lost ACK/);
  const journal = api.b2RecoveryJournal(api.b2RecoveryStore(config, p.fetcher), directory);
  assert.deepEqual(await journal.append(origin, [event]), { origin, head: 1 });
  assert.equal(p.files.length, 1);
  assert.deepEqual(await journal.append(origin, [event, { ...event, sequence: 2 }]), { origin, head: 2 });
  assert.equal(p.files.length, 2);
  await assert.rejects(() => journal.append(origin, [{ ...event, object_id: "fork" }]), /conflict|ahead/);
  const missingWitness = await mkdtemp(join(scratch, "lost-witness-"));
  await assert.rejects(() => api.b2RecoveryJournal(api.b2RecoveryStore(config, p.fetcher), missingWitness).append(origin, [event, { ...event, sequence: 2 }]), /unprovable/);
  assert.equal(p.files.length, 2, "unprovable prefix must never upload");
});
test("encrypted offhost privacy journal retries a lost ACK after restart, detects divergent versions and gaps", async () => {
  assert.equal(typeof api.b2RecoveryJournal, "function", "offhost privacy journal missing");
  const p = provider(), store = api.b2RecoveryStore(config, p.fetcher);
  let journal = api.b2RecoveryJournal(store, scratch);
  const origin = "a".repeat(32);
  const event = { sequence: 1, kind: "withdrawn" as const, object_id: "synthetic-private-id", count: 0, expires_at: 0 };
  p.loseAck();
  await assert.rejects(() => journal.append(origin, [event]), /lost ACK/);
  journal = api.b2RecoveryJournal(api.b2RecoveryStore(config, p.fetcher), scratch);
  assert.deepEqual(await journal.append(origin, [event]), { origin, head: 1 });
  assert.equal(p.files.length, 1, "lost ACK retry must discover exact already persisted revisions");
  assert.deepEqual(await api.b2RecoveryJournal(api.offlineRecoveryStore(store, identityFile)).read(origin), { origin, head: 1, events: [event] });
  await assert.rejects(() => journal.append(origin, [{ ...event, object_id: "different" }]), /conflict/);
  await assert.rejects(() => journal.append(origin, [event, { ...event, sequence: 3 }]), /sequence/);
  const extended = [event, { ...event, sequence: 2, kind: "redacted" as const }];
  await journal.append(origin, extended);
  assert.deepEqual((await api.b2RecoveryJournal(api.offlineRecoveryStore(store, identityFile)).read(origin)).events, extended);
  // An independently uploaded conflicting old version cannot silently disappear below a newer head.
  await store.put(`journal/${origin}`, Buffer.from(JSON.stringify({ version: 1, origin, events: [{ ...event, object_id: "fork" }] })));
  await assert.rejects(() => api.b2RecoveryJournal(api.offlineRecoveryStore(store, identityFile)).read(origin), /conflict/);
});

test("real SQLite offhost backup restores only after complete post-backup erasure journal and quarantines mail", async () => {
  assert.equal(typeof api.backupOffhost, "function", "offhost online backup orchestration missing");
  assert.equal(typeof api.restoreOffhost, "function", "guarded offhost restore missing");
  const p = provider(), store = api.b2RecoveryStore(config, p.fetcher), f = fixture();
  const dir = await mkdtemp(join(tmpdir(), "offhost-")), destination = join(dir, "restored.sqlite");
  try {
    await submit(f.ctx, { ...valid, comment: "synthetic post-backup erased text" }, "synthetic-offhost-1", "192.0.2.1");
    confirm(f.ctx, new URLSearchParams(new URL(f.mail[0].confirm).hash.slice(1)).get("confirm"));
    const id = String(f.db.prepare("SELECT id FROM reviews").get()!.id);
    moderate(f.ctx, { sub: "synthetic-owner", role: "moderator" }, id, "published", "reviewed");
    const receipt = await api.backupOffhost(f.db, store, dir, f.ctx.now());
    moderate(f.ctx, { sub: "synthetic-owner", role: "moderator" }, id, "withdrawn", "author_request");
    const cut = api.authoritativeOffhostCut(f.db);
    await assert.rejects(() => api.restoreOffhost(api.offlineRecoveryStore(store, identityFile), receipt, destination, cut, dir, f.ctx.now()), /incomplete/);
    await access(destination + ".restore-pending");
    // Retrieving a fresh remote tail is separate from obtaining the independent expected cut.
    await api.b2RecoveryJournal(store, dir).append(cut.origin, f.db.prepare("SELECT sequence,kind,object_id,count,expires_at FROM recovery_events ORDER BY sequence").all() as any);
    await api.reconcileOffhost(api.offlineRecoveryStore(store, identityFile), destination, cut, f.ctx.now());
    await assert.rejects(() => access(destination + ".restore-pending"));
    const restored = openDB(destination);
    try {
      assert.equal(restored.prepare("SELECT comment_plaintext FROM reviews WHERE id=?").get(id)!.comment_plaintext, "");
      assert.equal(restored.prepare("SELECT count(*) n FROM review_private").get()!.n, 0);
      assert.equal(restored.prepare("SELECT count(*) n FROM outbox").get()!.n, 0);
      assert.deepEqual(recoveryHead(restored), {origin:cut.origin,head:cut.head});
    } finally { restored.close(); }
    const late = f.ctx.now() + 31 * 86400000;
    await assert.rejects(() => api.restoreOffhost(api.offlineRecoveryStore(store, identityFile), receipt, join(dir, "expired.sqlite"), cut, dir, late), /expired/);
    await assert.rejects(() => api.restoreOffhost(api.offlineRecoveryStore(store, identityFile), { ...receipt, createdAt: late }, join(dir, "forged-age.sqlite"), cut, dir, late), /receipt/);
  } finally { f.db.close(); await rm(dir, { recursive: true, force: true }); }
});

test("offhost cycle is restart durable, coalesces concurrent calls and records only readback-verified backups", async () => {
  assert.equal(typeof api.createRecoveryCycle, "function", "offhost scheduler cycle missing");
  const f = fixture(), p = provider(), store = api.b2RecoveryStore(config, p.fetcher);
  const dir = await mkdtemp(join(tmpdir(), "offhost-cycle-"));
  try {
    let now = f.ctx.now();
    const cycle = api.createRecoveryCycle(f.db, store, dir, () => now);
    await Promise.all([cycle(), cycle()]);
    let state = JSON.parse(await readFile(join(dir, "offhost-state.json"), "utf8"));
    const backupCount = p.files.filter(f => f.fileName.includes("/backups/")).length;
    assert.equal(backupCount, 1);
    await api.createRecoveryCycle(f.db, store, dir, () => now)();
    assert.equal(p.files.filter(f => f.fileName.includes("/backups/")).length, backupCount);
    state = JSON.parse(await readFile(join(dir, "offhost-state.json"), "utf8")); // capacity includes newly persisted state bytes
    now += 86400001; p.failReads(true);
    await assert.rejects(() => cycle());
    assert.deepEqual(JSON.parse(await readFile(join(dir, "offhost-state.json"), "utf8")), state);
    p.failReads(false); await cycle();
    assert.equal(JSON.parse(await readFile(join(dir, "offhost-state.json"), "utf8")).lastBackup.createdAt, now);
  } finally { f.db.close(); await rm(dir, { recursive: true, force: true }); }
});
test("scheduler serializes slow provider operations, reports failure and drains before DB shutdown", async () => {
  assert.equal(typeof api.scheduleOffhost, "function", "offhost scheduling missing");
  let calls = 0, failures = 0, finish!: () => void, began!: () => void;
  const started = new Promise<void>(r => { began = r; });
  const hold = new Promise<void>(r => { finish = r; });
  const worker = api.scheduleOffhost(async () => { calls++; began(); await hold; throw new Error("synthetic failure"); }, () => { failures++; }, 5);
  await started; await delay(20); assert.equal(calls, 1);
  const stopped = worker.stop(); finish(); await stopped;
  assert.equal(failures, 1); await delay(20); assert.equal(calls, 1);
});
test("B2 transport rejects broad credentials and provider-directed credential exfiltration before upload", async () => {
  for (const mutate of [
    (a: any) => { a.apiInfo.storageApi.apiUrl = "https://evil.example.invalid"; },
    (a: any) => { a.apiInfo.storageApi.allowed.buckets = null; },
    (a: any) => { a.apiInfo.storageApi.allowed.namePrefix = ""; },
    (a: any) => { a.apiInfo.storageApi.allowed.capabilities.push("deleteFiles"); },
  ]) {
    const p = provider();
    const transport = (async (url, init) => {
      const response = await p.fetcher(url, init);
      if (String(url).endsWith("b2_authorize_account")) { const body = await response.json(); mutate(body); return new Response(JSON.stringify(body)); }
      return response;
    }) as typeof fetch;
    await assert.rejects(() => api.b2RecoveryStore(config, transport).put("backups/blocked.enc", Buffer.from("synthetic")));
    assert.equal(p.files.length, 0);
    assert.equal(p.requests.length, 1);
  }
});
test("B2 journal pagination includes old versions and ciphertext corruption cannot be acknowledged", async () => {
  const p = provider(), store = api.b2RecoveryStore(config, p.fetcher), origin = "b".repeat(32);
  const one = { sequence: 1, kind: "withdrawn" as const, object_id: "synthetic-1", count: 0, expires_at: 0 };
  const journal = api.b2RecoveryJournal(store, scratch);
  await journal.append(origin, [one]); await journal.append(origin, [one, { ...one, sequence: 2 }]);
  let pages = 0;
  const transport = (async (url, init) => {
    if (!String(url).endsWith("b2_list_file_versions")) return p.fetcher(url, init);
    const query = JSON.parse(String(init?.body)); pages++;
    const files = query.startFileId ? p.files.slice(1) : p.files.slice(0, 1);
    return new Response(JSON.stringify({ files: files.map(({body, ...f}) => f), nextFileName: query.startFileId ? null : p.files[1].fileName, nextFileId: query.startFileId ? null : p.files[1].fileId }));
  }) as typeof fetch;
  assert.equal((await api.b2RecoveryJournal(api.offlineRecoveryStore(api.b2RecoveryStore(config, transport), identityFile)).read(origin)).head, 2);
  assert.equal(pages, 2);
  p.files[0].body[35] ^= 1;
  await assert.rejects(() => api.b2RecoveryJournal(api.offlineRecoveryStore(store, identityFile)).read(origin), /integrity/);
});

test("journal cost/capacity bound fails closed before downloading an oversized retained history", async () => {
  const p = provider(), origin = "c".repeat(32);
  const store = api.b2RecoveryStore(config, p.fetcher);
  await api.b2RecoveryJournal(store, scratch).append(origin, [{ sequence: 1, kind: "withdrawn", object_id: "synthetic", count: 0, expires_at: 0 }]);
  p.requests.length = 0;
  const transport = (async (url, init) => {
    const response = await p.fetcher(url, init);
    if (!String(url).endsWith("b2_list_file_versions")) return response;
    const v = await response.json();
    v.files = [0, 1].map(n => ({ ...v.files[0], fileId: "oversized-" + n, contentLength: 40 * 1024 * 1024 }));
    return new Response(JSON.stringify(v));
  }) as typeof fetch;
  await assert.rejects(() => api.b2RecoveryJournal(api.offlineRecoveryStore(api.b2RecoveryStore(config, transport), identityFile)).read(origin), /capacity/);
  assert.equal(p.requests.filter(r => r.url.includes("b2_download_file_by_id")).length, 0);
});

test("R2 readBucketRetentions is mandatory before policy access; unauthorized null lock is realistic", async () => {
  const p = provider(false);
  assert.deepEqual(p.policy.buckets[0].fileLockConfiguration, { isClientAuthorizedToRead: false, value: null });
  await assert.rejects(() => api.b2RecoveryStore(config, p.fetcher).put("backups/blocked.enc", Buffer.from("synthetic")));
  assert.equal(p.files.length, 0);
  assert.equal(p.requests.length, 1, "missing required capabilities must fail at authorization");
  const authorized = provider();
  await api.b2RecoveryStore(config, authorized.fetcher).put("backups/allowed.enc", Buffer.from("synthetic"));
  assert.equal(authorized.files.length, 1);
});
test("B2 writes refuse public/unknown buckets, unbounded body retention, journal pruning and immutable object-lock policies", async () => {
  for (const mutate of [
    (b: any) => { b.bucketType = "allPublic"; },
    (b: any) => { b.lifecycleRules = []; },
    (b: any) => { b.lifecycleRules[0].daysFromHidingToDeleting = null; },
    (b: any) => { b.lifecycleRules.push({ fileNamePrefix: "reviews/", daysFromHidingToDeleting: 1 }); },
    (b: any) => { b.fileLockConfiguration.value.isFileLockEnabled = true; },
    (b: any) => { b.fileLockConfiguration = { isClientAuthorizedToRead: false, value: null }; },
    (b: any) => { b.fileLockConfiguration.isClientAuthorizedToRead = false; },
  ]) {
    const p = provider(); mutate(p.policy.buckets[0]);
    await assert.rejects(() => api.b2RecoveryStore(config, p.fetcher).put("backups/blocked.enc", Buffer.from("synthetic")), /policy/);
    assert.equal(p.files.length, 0, "unsafe policy must block before provider write");
  }
});

test("operations CLI actually dispatches configured B2 journal and backup using a synthetic HTTP boundary", async () => {
  const f = fixture(), dir = await mkdtemp(join(tmpdir(), "offhost-cli-"));
  try {
    await submit(f.ctx, valid, "synthetic-offhost-cli", "192.0.2.11");
    const source = join(dir, "source.sqlite"), receipt = join(dir, "receipt.json");
    const destination = join(dir, "cli-restored.sqlite"), spec = join(dir, "recovery-spec.json");
    const cut = api.authoritativeOffhostCut(f.db);
    await backupDatabase(f.db, source);
    const cliUrl = new URL("../scripts/operations.ts", import.meta.url).href;
    const code = `globalThis.fetch = (${provider.toString()})().fetcher;
      process.argv = [process.execPath, 'operations.ts', 'journal-head-offhost', ${JSON.stringify(source)}];
      await import(${JSON.stringify(cliUrl + "?source-authority")});
      process.argv = [process.execPath, 'operations.ts', 'journal-sync-offhost', ${JSON.stringify(source)}];
      await import(${JSON.stringify(cliUrl)});
      process.argv = [process.execPath, 'operations.ts', 'backup-offhost', ${JSON.stringify(source)}, ${JSON.stringify(receipt)}];
      await import(${JSON.stringify(cliUrl + "?second-command")});
      const fs = await import('node:fs/promises');
      await fs.writeFile(${JSON.stringify(spec)}, JSON.stringify({version:4,backup:JSON.parse(await fs.readFile(${JSON.stringify(receipt)},'utf8')), expected:${JSON.stringify(cut)}}), {mode:0o600});
      process.argv = [process.execPath,'operations.ts','restore-offhost',${JSON.stringify(destination)},${JSON.stringify(spec)},${JSON.stringify(identityFile)}];
      await import(${JSON.stringify(cliUrl + "?offline-restore")});`;
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", code], { encoding: "utf8", env: {
      PATH: process.env.PATH, REVIEWS_RECOVERY_PROVIDER: "b2", REVIEWS_B2_KEY_ID: config.keyId,
      REVIEWS_B2_APPLICATION_KEY: config.applicationKey, REVIEWS_B2_BUCKET_ID: config.bucketId,
      REVIEWS_B2_PREFIX: config.prefix, REVIEWS_BACKUP_RECIPIENT: config.recipient,
    } });
    assert.equal(result.status, 0, result.stderr);
    const authorityLine=result.stdout.split("\n").find(line=>line.includes('"contentSha256"'))!;
    assert.deepEqual(JSON.parse(authorityLine),cut);
    const saved = JSON.parse(await readFile(receipt, "utf8")); assert.equal(saved.object.bucketId, config.bucketId);
    const reopened = openDB(source);
    try { assert.equal(reopened.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged, recoveryHead(reopened).head); }
    finally { reopened.close(); }
    const restored = openDB(destination);
    try { assert.equal(restored.prepare("SELECT count(*) n FROM outbox").get()!.n, 0); assert.deepEqual(recoveryHead(restored), {origin:cut.origin,head:cut.head}); }
    finally { restored.close(); }
    await assert.rejects(() => access(destination + ".restore-pending"));
    assert.ok(!result.stdout.includes(config.applicationKey));
  } finally { f.db.close(); await rm(dir, { recursive: true, force: true }); }
});

test("R1 real CLI process restart recovers accepted lost ACK without an identity or duplicate upload", async () => {
  const f = fixture(), directory = await mkdtemp(join(scratch, "cli-restart-"));
  try {
    await submit(f.ctx, valid, "synthetic-lost-ack-process", "192.0.2.19");
    const source = join(directory, "source.sqlite"), remote = join(directory, "synthetic-remote.json");
    await backupDatabase(f.db, source);
    const cliUrl = new URL("../scripts/operations.ts", import.meta.url).href;
    const run = (lose: boolean) => {
      const code = `import {readFileSync,writeFileSync,existsSync} from 'node:fs';
        const p = (${provider.toString()})();
        const path = ${JSON.stringify(remote)};
        if (existsSync(path)) p.files.push(...JSON.parse(readFileSync(path,'utf8')).map(f=>({...f,body:Buffer.from(f.body,'base64')})));
        if (${lose}) p.loseAck();
        globalThis.fetch = async (...args) => { try { return await p.fetcher(...args); } finally {
          writeFileSync(path, JSON.stringify(p.files.map(f=>({...f,body:f.body.toString('base64')}))), {mode:0o600});
        } };
        process.argv = [process.execPath,'operations.ts','journal-sync-offhost',${JSON.stringify(source)}];
        await import(${JSON.stringify(cliUrl)});`;
      return spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", code], { encoding: "utf8", env: {
        PATH: process.env.PATH, REVIEWS_RECOVERY_PROVIDER: "b2", REVIEWS_B2_KEY_ID: config.keyId,
        REVIEWS_B2_APPLICATION_KEY: config.applicationKey, REVIEWS_B2_BUCKET_ID: config.bucketId,
        REVIEWS_B2_PREFIX: config.prefix, REVIEWS_BACKUP_RECIPIENT: config.recipient,
      } });
    };
    const lost = run(true); assert.equal(lost.status, 1, lost.stderr);
    let db = openDB(source);
    try { assert.equal(db.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged, 0); }
    finally { db.close(); }
    const retry = run(false); assert.equal(retry.status, 0, retry.stderr);
    assert.equal(JSON.parse(await readFile(remote, "utf8")).length, 1);
    db = openDB(source);
    try { assert.equal(db.prepare("SELECT acknowledged FROM recovery_state").get()!.acknowledged, recoveryHead(db).head); }
    finally { db.close(); }
  } finally { f.db.close(); }
});

test("R1 unknown, hidden, missing and corrupt journal prefixes never permit online append", async () => {
  const event = { sequence: 1, kind: "withdrawn" as const, object_id: "synthetic-only", count: 0, expires_at: 0 };
  for (const mutate of [
    async (p: ReturnType<typeof provider>, store: api.RecoveryStore, origin: string) => { await store.put(`journal/${origin}`, Buffer.from(JSON.stringify({version:1,origin,events:[event]}))); },
    async (p: ReturnType<typeof provider>) => { p.files[0].action = "hide"; },
    async (p: ReturnType<typeof provider>) => { p.files.length = 0; },
    async (p: ReturnType<typeof provider>) => { p.files[0].body[35] ^= 1; },
  ]) {
    const p = provider(), store = api.b2RecoveryStore(config, p.fetcher), origin = "e".repeat(32);
    const directory = await mkdtemp(join(scratch, "negative-"));
    const journal = api.b2RecoveryJournal(store, directory);
    await journal.append(origin, [event]); await mutate(p, store, origin);
    const count = p.requests.filter(r => r.url.includes("b2_upload_file/")).length;
    await assert.rejects(() => journal.append(origin, [event, {...event, sequence:2}]), /unprovable|hide|integrity/);
    assert.equal(p.requests.filter(r => r.url.includes("b2_upload_file/")).length, count);
  }
});

test("R1 age offline wrong identity and tampered ciphertext fail; online restore lacks capability", async () => {
  const p = provider(), store = api.b2RecoveryStore(config, p.fetcher);
  const receipt = await store.put("backups/negative.enc", Buffer.from("synthetic"));
  const wrong = join(scratch, "wrong-identity.txt");
  assert.equal(spawnSync("age-keygen", ["-o", wrong]).status, 0);
  await assert.rejects(() => api.offlineRecoveryStore(store, wrong).readPlaintext!(receipt), /age operation failed/);
  await assert.rejects(() => api.restoreOffhost(store, {version:1, createdAt:1, object:{...receipt,fileName:"reviews/backups/1-"+"a".repeat(32)+".enc"}, observedJournalCut:{origin:"a".repeat(32),head:0}}, join(scratch,"no-capability.sqlite"), {origin:"a".repeat(32),head:0,contentSha256:"0".repeat(64)}, scratch, 1), /offline decrypt/);
  p.files[0].body[p.files[0].body.length - 1] ^= 1;
  // Recompute transport metadata: age, not SHA-1, must reject the modified payload.
  const {createHash} = await import("node:crypto");
  const forged = {...receipt, contentSha1:createHash("sha1").update(p.files[0].body).digest("hex")};
  await assert.rejects(() => api.offlineRecoveryStore(store, identityFile).readPlaintext!(forged), /age operation failed/);
});

test("R1 authorized offline restore rebuilds lost local witnesses before online writer takeover", async () => {
  const p = provider(), store = api.b2RecoveryStore(config, p.fetcher), f = fixture();
  const sourceDirectory = await mkdtemp(join(scratch, "source-custody-"));
  const restoredDirectory = await mkdtemp(join(scratch, "lost-source-custody-"));
  const destination = join(restoredDirectory, "restored.sqlite");
  try {
    await submit(f.ctx, valid, "synthetic-witness-takeover", "192.0.2.21");
    const cut = api.authoritativeOffhostCut(f.db);
    const receipt = await api.backupOffhost(f.db, store, sourceDirectory, f.ctx.now());
    await api.restoreOffhost(api.offlineRecoveryStore(store, identityFile), receipt, destination, cut, restoredDirectory, f.ctx.now());
    const restored = openDB(destination);
    try {
      const {syncRecovery} = await import("../src/recovery.ts");
      assert.deepEqual(await syncRecovery(restored, api.b2RecoveryJournal(api.b2RecoveryStore(config, p.fetcher), restoredDirectory)), {origin:cut.origin,head:cut.head});
    } finally { restored.close(); }
    assert.equal(p.files.filter(f=>f.fileName.includes("/journal/")).length, 1, "takeover must not replace/drop retained history");
  } finally { f.db.close(); }
});

test("R1 public-recipient ciphertext is not sender proof: offline restore requires independent source content commitment", async () => {
  const p = provider(), store = api.b2RecoveryStore(config, p.fetcher), f = fixture();
  const sourceDirectory = await mkdtemp(join(scratch, "commitment-source-"));
  const destinationDirectory = await mkdtemp(join(scratch, "commitment-restore-"));
  const first = {sequence:1,kind:"withdrawn" as const,object_id:"synthetic-first",count:0,expires_at:0};
  const second = {...first,sequence:2,object_id:"synthetic-authoritative-erasure"};
  try {
    const insert=f.db.prepare("INSERT INTO recovery_events(sequence,kind,object_id,count,expires_at) VALUES (?,?,?,?,?)");
    insert.run(...Object.values(first));
    const receipt=await api.backupOffhost(f.db,store,sourceDirectory,f.ctx.now());
    insert.run(...Object.values(second));
    const cut=recoveryHead(f.db);
    const {createHash}=await import("node:crypto");
    const expected={...cut,contentSha256:createHash("sha256").update(JSON.stringify({version:1,origin:cut.origin,events:[first,second]})).digest("hex")};
    // A storage writer knows the public recipient and can create valid age ciphertext,
    // but cannot invent an independent source commitment for a different erasure tail.
    p.files.splice(0,p.files.length,...p.files.filter(f=>!f.fileName.includes("/journal/")));
    await store.put(`journal/${cut.origin}`,Buffer.from(JSON.stringify({version:1,origin:cut.origin,events:[first,{...second,object_id:"forged-erasure-target"}]})));
    const destination=join(destinationDirectory,"rejected.sqlite");
    await assert.rejects(()=>api.restoreOffhost(api.offlineRecoveryStore(store,identityFile),receipt,destination,expected,destinationDirectory,f.ctx.now()),/commitment|authority/);
    await access(destination+".restore-pending");
    await assert.rejects(()=>access(join(destinationDirectory,"offhost-witness.sqlite")), "untrusted public-recipient content must not rebuild source witnesses");
  } finally {f.db.close();}
});

test("B2 configuration is explicit and rejects partial, malformed or local-preview outbound bindings", () => {
  assert.equal(typeof api.recoveryConfig, "function", "provider environment binding missing");
  assert.equal(api.recoveryConfig({}), null);
  const env = { REVIEWS_RECOVERY_PROVIDER: "b2", REVIEWS_B2_KEY_ID: config.keyId, REVIEWS_B2_APPLICATION_KEY: config.applicationKey,
    REVIEWS_B2_BUCKET_ID: config.bucketId, REVIEWS_B2_PREFIX: config.prefix, REVIEWS_BACKUP_RECIPIENT: config.recipient };
  assert.deepEqual(api.recoveryConfig(env), config);
  for (const bad of [{ REVIEWS_B2_APPLICATION_KEY: "" }, { REVIEWS_B2_PREFIX: "../" }, { REVIEWS_BACKUP_RECIPIENT: "junk" }, { REVIEWS_BACKUP_KEY: "forbidden" }, { REVIEWS_BACKUP_IDENTITY: "/forbidden" }, { REVIEWS_MODE: "local" }, { REVIEWS_RECOVERY_PROVIDER: "filesystem" }])
    assert.throws(() => api.recoveryConfig({ ...env, ...bad }));
  const cli = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/operations.ts", "journal-sync-offhost", "nonexistent.sqlite"], { encoding: "utf8", env: { PATH: process.env.PATH } });
  assert.equal(cli.status, 1);
});

test("operations inventory enumerates every prefix version and bounded put refuses aggregate capacity before upload", async () => {
  const p=provider(),dir=await mkdtemp(join(scratch,"aggregate-"));
  const store=api.b2RecoveryStore(config,p.fetcher,dir);
  assert.equal(typeof store.inventory,"function","all-prefix version inventory missing");
  const original=await store.put("backups/first.enc",Buffer.from("synthetic"));
  assert.equal((await store.inventory()).length,1);
  p.files.push({...p.files[0],fileId:"capacity-only",fileName:"reviews/logs/old.enc",contentLength:7999999999});
  const uploads=p.requests.filter(r=>r.url.includes("b2_upload_file/")).length;
  await assert.rejects(()=>store.put("journal/blocked",Buffer.from("blocked")),/capacity/);
  assert.equal(p.requests.filter(r=>r.url.includes("b2_upload_file/")).length,uploads);
  assert.equal(p.files[0].fileId,original.fileId);
});

test("cycle records independent error marker and 7daily/4weekly catalog before healthy admission", async () => {
  const {probeBackup}=await import("../src/backup-operations.ts");
  const f=fixture(),p=provider(),dir=await mkdtemp(join(scratch,"cycle-status-"));
  let now=f.ctx.now();
  try {
    const cycle=api.createRecoveryCycle(f.db,api.b2RecoveryStore(config,p.fetcher),dir,()=>now);
    await cycle();
    const state=JSON.parse(await readFile(join(dir,"offhost-state.json"),"utf8"));
    assert.equal(state.rotation.daily.length,1,"rotation receipt absent");
    assert.equal(state.rotation.weekly.length,1);
    assert.equal(probeBackup(dir,now).admitted,true);
    now+=86400001;p.failReads(true);
    await assert.rejects(()=>cycle());
    assert.equal(probeBackup(dir,now).reason,"backup_error");
    p.failReads(false);await cycle();
    assert.equal(probeBackup(dir,now).admitted,true);
    assert.equal(p.files.filter(f=>f.fileName.includes("/backups/")).length,2,"ambiguous backup readback must not create duplicate ciphertext on retry");
  } finally {f.db.close();}
});

test("cycle rejects clock rollback against prior sync even with a still-past backup; error is durable", async () => {
  const {writeFile}=await import("node:fs/promises");
  const f=fixture(),p=provider(),dir=await mkdtemp(join(scratch,"rollback-"));
  let now=f.ctx.now();
  try {
    const cycle=api.createRecoveryCycle(f.db,api.b2RecoveryStore(config,p.fetcher),dir,()=>now);
    await cycle(); now+=60000;await cycle();now-=1;
    await assert.rejects(()=>cycle(),/schedule state|clock/);
    assert.ok(await readFile(join(dir,"offhost-error.json")));
  } finally {f.db.close();}
});

test("verified backup receipt survives restart before schedule-state publication without another upload", async () => {
  const f=fixture(),p=provider(),dir=await mkdtemp(join(scratch,"receipt-restart-"));
  let now=f.ctx.now();
  try {
    const store=api.b2RecoveryStore(config,p.fetcher);
    await api.createRecoveryCycle(f.db,store,dir,()=>now)();
    now+=DAY_FOR_TEST;
    await api.backupOffhost(f.db,store,dir,now); // process boundary before schedule commit
    await api.createRecoveryCycle(f.db,api.b2RecoveryStore(config,p.fetcher),dir,()=>now)();
    assert.equal(p.files.filter(f=>f.fileName.includes("/backups/")).length,2);
  } finally {f.db.close();}
});
for(const corruptWitness of [false,true])test('tagged accepted backup reconciles PRE-upload SHA256 across restart, corrupt='+corruptWitness,async()=>{
 const f=fixture(),p=provider(),dir=await mkdtemp(join(scratch,'tagged-pending-'));
 try{
  p.loseAck();
  await assert.rejects(api.createRecoveryCycle(f.db,api.b2RecoveryStore(config,p.fetcher),dir,f.ctx.now)(),/lost ACK/);
  const backup=p.files.find(x=>x.fileName.includes('/backups/'));assert.ok(backup);
  backup.contentSha1='unverified:'+backup.contentSha1;
  if(corruptWitness){
   // Internally consistent metadata cannot override the independent pre-upload SHA256.
   backup.body=Buffer.from(backup.body);backup.body[backup.body.length-1]^=1;
   const {createHash}=await import('node:crypto');backup.contentSha1='unverified:'+createHash('sha1').update(backup.body).digest('hex');
  }
  const uploads=p.requests.filter(x=>x.url.includes('b2_upload_file/')).length;
  const resumed=api.createRecoveryCycle(f.db,api.b2RecoveryStore(config,p.fetcher),dir,f.ctx.now);
  if(corruptWitness)await assert.rejects(resumed());else{
   await resumed();
   const state=JSON.parse(await readFile(join(dir,'offhost-state.json'),'utf8'));
   assert.equal(state.lastBackup.object.fileId,backup.fileId);
   assert.match(state.lastBackup.object.contentSha1,/^[a-f0-9]{40}$/);
  }
  assert.equal(p.requests.filter(x=>x.url.includes('b2_upload_file/')).length,uploads);
  assert.equal(p.files.filter(x=>x.fileName.includes('/backups/')).length,1);
 }finally{f.db.close();}
});
const DAY_FOR_TEST=86400000;

test("40 real age/SQLite daily cycles rotate seven daily and four weekly references with synthetic authorized pruner", async () => {
  const f=fixture(),p=provider(),dir=await mkdtemp(join(scratch,"forty-days-"));
  let now=f.ctx.now();
  const store={...api.b2RecoveryStore(config,p.fetcher),remove:async(r:api.ObjectReceipt)=>{
    assert.ok(r.fileName.startsWith("reviews/backups/"));
    p.files.splice(p.files.findIndex(f=>f.fileId===r.fileId),1);
  }};
  try {
    for(let i=0;i<40;i++) {
      await api.createRecoveryCycle(f.db,store,dir,()=>now)();
      const state=JSON.parse(await readFile(join(dir,"offhost-state.json"),"utf8"));
      assert.ok(state.rotation.daily.length<=7);assert.ok(state.rotation.weekly.length<=4);
      assert.ok(p.files.filter(f=>f.fileName.includes("/backups/")).length<=11);
      now+=86400000;
    }
    const state=JSON.parse(await readFile(join(dir,"offhost-state.json"),"utf8"));
    assert.equal(state.rotation.daily.length,7);assert.equal(state.rotation.weekly.length,4);
  } finally {f.db.close();}
});
test("least privilege B2 cycle stops on actual pruning need instead of calling delete or relabeling 28daily as rotation", async () => {
  const f=fixture(),p=provider(),dir=await mkdtemp(join(scratch,"no-delete-right-"));
  let now=f.ctx.now();
  try {
    let blocked=false;
    for(let i=0;i<15;i++) {
      try { await api.createRecoveryCycle(f.db,api.b2RecoveryStore(config,p.fetcher),dir,()=>now)(); }
      catch(error) {assert.match(String(error),/rotation pruning unavailable/i);blocked=true;break;}
      now+=86400000;
    }
    assert.equal(blocked,true);assert.ok(await readFile(join(dir,"offhost-error.json")));
    assert.ok(!p.requests.some(r=>r.url.includes("delete")));
  } finally {f.db.close();}
});

test("pending backup witness timestamp must bind exact snapshot name before retry acknowledgement", async () => {
  const {writeFile}=await import("node:fs/promises");
  const f=fixture(),p=provider(),dir=await mkdtemp(join(scratch,"pending-name-"));
  try {
    const now=f.ctx.now(),store=api.b2RecoveryStore(config,p.fetcher);
    p.failReads(true);await assert.rejects(()=>api.backupOffhost(f.db,store,dir,now));
    p.failReads(false);
    const pending=JSON.parse(await readFile(join(dir,"offhost-backup-pending.json"),"utf8"));
    pending.createdAt=now+1;
    await writeFile(join(dir,"offhost-backup-pending.json"),JSON.stringify(pending));
    await assert.rejects(()=>api.backupOffhost(f.db,store,dir,now+1),/pending backup witness/);
  } finally {f.db.close();}
});
