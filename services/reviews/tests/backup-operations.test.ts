import { test } from "node:test";
import assert from "node:assert/strict";
const ops: any = await import("../src/backup-operations.ts").catch(() => ({}));
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
const DAY = 86400000;
function goodState(now:number) {
 const cut={origin:'a'.repeat(32),head:0};
 const object={fileId:'backup',fileName:`reviews/backups/${now}-${'a'.repeat(32)}.enc`,bucketId:'bucket',contentLength:32,contentSha1:'b'.repeat(40)};
 return {version:2,lastVerifiedSync:now,lastRemoteVerifiedAt:now,observedJournalCut:cut,lastBackup:{version:1,createdAt:now,object,observedJournalCut:cut},rotation:{daily:[object],weekly:[object]},capacity:{remote:32,local:0,projected:0,total:32,scope:'restricted-prefix-all-versions-plus-private-directory; NOT provider account spend cap'}};
}
function publishState(dir:string,state:any) {ops.finishBackupCycle(dir,ops.beginBackupCycle(dir,state.lastVerifiedSync),state,true);}
test("rotation retains seven UTC daily cuts plus four weekly cuts, not 28 daily copies", () => {
  assert.equal(typeof ops.rotationPlan, "function", "7+4 rotation missing");
  const now = 40 * DAY;
  const cuts = Array.from({length: 40}, (_, i) => ({createdAt: (i + 1) * DAY, id: String(i + 1)}));
  const plan = ops.rotationPlan(cuts, now);
  assert.equal(plan.daily.length, 7);
  assert.equal(plan.weekly.length, 4);
  assert.ok(plan.keep.length <= 11);
  assert.equal(plan.keep.length + plan.remove.length, cuts.length);
  assert.ok(plan.keep.includes(cuts.at(-1)!));
});

test("rotation executor deletes only obsolete snapshot IDs and verifies absence; journal survives", async () => {
  assert.equal(typeof ops.rotateBackups, "function", "rotation executor missing");
  const dir = await mkdtemp(join(tmpdir(), "rotation-"));
  const files = Array.from({length:40},(_,i)=>({fileId:String(i),fileName:`reviews/backups/${(i+1)*DAY}-${"a".repeat(32)}.enc`,contentLength:32,contentSha1:"a".repeat(40),bucketId:"b"}));
  const journal = { ...files[0], fileId:"journal", fileName:"reviews/journal/origin" };
  const remote = [...files,journal];
  try {
    for (const f of remote) await writeFile(join(dir,f.fileId),"ciphertext");
    const store = { backupPrefix:"reviews/backups/", inventory:async()=>[...remote], get:async(f:any)=>readFile(join(dir,f.fileId)),
      remove:async(f:any)=>{await rm(join(dir,f.fileId));remote.splice(remote.findIndex(x=>x.fileId===f.fileId),1);} };
    const plan = await ops.rotateBackups(store,40*DAY);
    assert.equal(remote.length,plan.keep.length+1);
    assert.ok(remote.includes(journal));
    assert.ok(remote.length<=12);
    const noDelete = {...store,inventory:async()=>files,remove:undefined};
    await assert.rejects(()=>ops.rotateBackups(noDelete,40*DAY),/rotation.*unavailable/i);
    await assert.rejects(()=>ops.rotateBackups({...store,inventory:async()=>files,remove:async()=>{}},40*DAY),/rotation.*readback/i);
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test("independent watchdog rejects absent/stale/future/error backup and persists a restart-safe alarm", async () => {
  assert.equal(typeof ops.probeBackup, "function", "independent backup probe missing");
  const dir=await mkdtemp(join(tmpdir(),"backup-probe-"));
  const now=40*DAY;
  const state=goodState(now);
  try {
    assert.equal(ops.probeBackup(dir,now).admitted,false);
    publishState(dir,state);
    assert.equal(ops.probeBackup(dir,now).admitted,true);
    assert.equal(ops.probeBackup(dir,now+120001).admitted,false);
    assert.equal(ops.probeBackup(dir,now).reason,"clock_rollback");
    publishState(dir,{...state,lastVerifiedSync:now+120002});
    assert.equal(ops.probeBackup(dir,now+120002).admitted,true);
    await writeFile(join(dir,"offhost-error.json"),"{}");
    assert.equal(ops.probeBackup(dir,now+120003).reason,"backup_error");
    assert.ok(await readFile(join(dir,"backup-watchdog.sqlite")));
  } finally {await rm(dir,{recursive:true,force:true});}
});

test("backup guard is independent of mail pause and precedes challenge/counter/review mutations", async () => {
  const {fixture,valid}=await import("./helpers/fixture.ts");
  const {submit}=await import("../src/submit.ts");
  const f=fixture(); let challenges=0, guards=0;
  try {
    const ctx={...f.ctx,mailEnabled:true,challenge:async()=>{challenges++;return true;},backupAdmission:()=>{guards++;throw new Error("backup_unavailable");}};
    await assert.rejects(()=>submit(ctx,valid,"synthetic-backup-guard","192.0.2.4"),/backup_unavailable/);
    assert.equal(guards,1); assert.equal(challenges,0);
    for(const table of ["reviews","rate_limits","outbox"]) assert.equal(f.db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n,0);
  } finally {f.db.close();}
});

test("watchdog CLI runs in a separate real process, producer stalled, and returns nonzero plus durable alarm", async () => {
  const {spawnSync}=await import("node:child_process");
  const dir=await mkdtemp(join(tmpdir(),"backup-independent-"));
  try {
    const state=goodState(1);
    publishState(dir,state);
    const child=spawnSync(process.execPath,["--experimental-strip-types","scripts/backup-watchdog.ts",dir],{encoding:"utf8",env:{PATH:process.env.PATH}});
    assert.equal(child.status,1,child.stderr);
    assert.notEqual(child.stdout.trim(),"","independent watchdog executable missing/no JSON result");
    assert.equal(JSON.parse(child.stdout).reason,"backup_stale");
    assert.ok(await readFile(join(dir,"backup-watchdog.sqlite")));
  } finally {await rm(dir,{recursive:true,force:true});}
});

test("aggregate capacity counts every remote version plus local logs/ledger and projected upload, strictly below 8GB", async () => {
  assert.equal(typeof ops.assertCapacity,"function","aggregate capacity missing");
  const dir=await mkdtemp(join(tmpdir(),"backup-capacity-"));
  try {
    await writeFile(join(dir,"ledger.sqlite"),Buffer.alloc(32));
    const remote=[{fileId:"old",fileName:"reviews/backups/old",contentLength:3999999900},{fileId:"hidden-version",fileName:"reviews/journal/log",contentLength:4000000000}];
    await assert.rejects(()=>ops.assertCapacity(remote,dir,68),/capacity/);
    assert.equal((await ops.assertCapacity(remote,dir,67)).total,7999999999);
    const {symlink}=await import("node:fs/promises");
    await symlink(join(dir,"ledger.sqlite"),join(dir,"linked"));
    await assert.rejects(()=>ops.assertCapacity([],dir,0),/capacity/);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test("aggregate request/transfer budget reserves before network, survives restart, rejects rollback and no refunds on failed calls", async () => {
  assert.equal(typeof ops.reserveRequest,"function","persistent aggregate task budget missing");
  const dir=await mkdtemp(join(tmpdir(),"backup-budget-"));
  const limits={dailyRequests:2,monthlyRequests:3,dailyBytes:100,monthlyBytes:120};
  try {
    ops.reserveRequest(dir,40*DAY,50,limits);
    ops.reserveRequest(dir,40*DAY,50,limits);
    assert.throws(()=>ops.reserveRequest(dir,40*DAY,1,limits),/budget/);
    assert.throws(()=>ops.reserveRequest(dir,39*DAY,1,limits),/clock/);
    ops.reserveRequest(dir,41*DAY,20,limits);
    assert.throws(()=>ops.reserveRequest(dir,42*DAY,1,limits),/budget/);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test("rotation never treats a journal path containing backups as snapshot and detects concurrent inventory drift", async () => {
  const snapshots=Array.from({length:40},(_,i)=>({fileId:String(i),fileName:`reviews/backups/${(i+1)*DAY}-${"a".repeat(32)}.enc`,contentLength:32}));
  const journal={fileId:"protected-ledger",fileName:`reviews/journal/backups/${DAY}-${"b".repeat(32)}.enc`,contentLength:32};
  let remote=[...snapshots,journal];
  const store={backupPrefix:"reviews/backups/",inventory:async()=>[...remote],get:async()=>Buffer.alloc(32),remove:async(f:any)=>{assert.notEqual(f.fileId,journal.fileId);remote=remote.filter(x=>x.fileId!==f.fileId);}};
  await ops.rotateBackups(store,40*DAY);
  assert.ok(remote.includes(journal));
  remote=[...snapshots,journal];let reads=0;
  await assert.rejects(()=>ops.rotateBackups({...store,inventory:async()=>{reads++;return reads===1?[...remote]:[...remote,{...snapshots[0],fileId:"concurrent"}];}},40*DAY),/rotation.*readback/i);
});

test("legacy healthy schedule without rotation/capacity proof must not open future mail admission", async () => {
  const dir=await mkdtemp(join(tmpdir(),"backup-legacy-"));
  try {
    await writeFile(join(dir,"offhost-state.json"),JSON.stringify({version:1,lastVerifiedSync:DAY,lastBackup:{version:1,createdAt:DAY}}));
    assert.equal(ops.probeBackup(dir,DAY).admitted,false);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test("rotation uses calendar windows, not seven/four arbitrarily old represented periods", () => {
  const old={createdAt:DAY},current={createdAt:100*DAY};
  const plan=ops.rotationPlan([old,current],100*DAY);
  assert.deepEqual(plan.keep,[current]);assert.deepEqual(plan.remove,[old]);
  assert.throws(()=>ops.rotationPlan([{createdAt:101*DAY}],100*DAY),/clock/);
});

test("budget last-slot reservations are serialized across actual independent processes", async () => {
  const {execFile}=await import("node:child_process");
  const {promisify}=await import("node:util");
  const run=promisify(execFile),dir=await mkdtemp(join(tmpdir(),"budget-race-"));
  try {
    const code=`import {reserveRequest} from ${JSON.stringify(new URL("../src/backup-operations.ts",import.meta.url).href)};try {reserveRequest(${JSON.stringify(dir)},${40*DAY},1,{dailyRequests:1,monthlyRequests:1,dailyBytes:2,monthlyBytes:2});}catch{process.exitCode=1;}`;
    const results=await Promise.all(Array.from({length:8},()=>run(process.execPath,["--experimental-strip-types","--input-type=module","-e",code]).then(()=>true,()=>false)));
    assert.equal(results.filter(Boolean).length,1);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test("stale snapshot blocks even when sync heartbeat is fresh; future and oversized/malformed states fail closed", async () => {
  const dir=await mkdtemp(join(tmpdir(),"backup-adversarial-"));
  const now=100*DAY;
  const good=goodState(now);
  try {
    for(const state of [{...good,lastBackup:{version:1,createdAt:now-DAY}}, {...good,lastVerifiedSync:now+1}, {...good,lastBackup:{version:1,createdAt:now+1}}, {...good,capacity:{total:8000000000}}, {...good,rotation:{daily:Array(8).fill({}),weekly:[{}]}}]) {
      await writeFile(join(dir,"offhost-state.json"),JSON.stringify(state));
      assert.equal(ops.probeBackup(dir,now).admitted,false);
    }
    await writeFile(join(dir,"offhost-state.json")," ".repeat(65537));
    assert.equal(ops.probeBackup(dir,now).admitted,false);
    publishState(dir,good);
    assert.equal(ops.probeBackup(dir,now).admitted,true);
  } finally {await rm(dir,{recursive:true,force:true});}
});
