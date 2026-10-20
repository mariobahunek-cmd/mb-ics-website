import { readdir, lstat } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { closeSync, openSync, chmodSync, readFileSync, statSync, existsSync, writeFileSync, renameSync, unlinkSync, fsyncSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
const DAY = 86400000;
// A weekly cut is a reference to an existing immutable daily ciphertext, never a
// decrypt/re-encrypt promotion. UTC weeks start Monday; no writer-clock expiry of ledger.
export function rotationPlan<T extends { createdAt: number }>(cuts: T[], now: number) {
  if (!Number.isSafeInteger(now) || now < 0 || cuts.some(c => !Number.isSafeInteger(c.createdAt) || c.createdAt < 0 || c.createdAt > now)) throw new Error("Invalid rotation clock/cut");
  const today=Math.floor(now/DAY), currentWeek=Math.floor((today+3)/7);
  const ordered = [...cuts].sort((a,b) => b.createdAt - a.createdAt);
  const days = new Set<number>(), weeks = new Set<number>();
  const daily: T[] = [], weekly: T[] = [];
  for (const cut of ordered) {
    const day = Math.floor(cut.createdAt / DAY), week = Math.floor((day + 3) / 7);
    if (day>=today-6 && !days.has(day)) { days.add(day); daily.push(cut); }
    if (week>=currentWeek-3 && !weeks.has(week)) { weeks.add(week); weekly.push(cut); }
  }
  const keep = ordered.filter(c => daily.includes(c) || weekly.includes(c));
  return { daily, weekly, keep, remove: ordered.filter(c => !keep.includes(c)) };
}

export interface StoredObject { fileId: string; fileName: string; contentLength: number }
export interface RotationStore {
  backupPrefix: string;
  inventory(): Promise<StoredObject[]>;
  get(object: any): Promise<Buffer>;
  // Intentionally absent from the existing least-privilege B2 writer. A separately
  // authorized pruning implementation is a LIVE gate, not a silently added right.
  remove?: (object: any) => Promise<void>;
}
export async function rotateBackups(store: RotationStore, now: number) {
  if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/backups\/$/.test(store.backupPrefix)) throw new Error("Invalid rotation prefix");
  const inventory = await store.inventory();
  const ids = new Set<string>();
  const cuts = inventory.filter(f => {
    if (!f.fileId || ids.has(f.fileId)) throw new Error("Invalid rotation inventory");
    ids.add(f.fileId);
    return f.fileName.startsWith(store.backupPrefix);
  }).map(object => {
    const match = object.fileName.slice(store.backupPrefix.length).match(/^([0-9]+)-[a-f0-9]{32}\.enc$/);
    if (!match) throw new Error("Unknown backup in rotation inventory");
    return {createdAt:Number(match[1]), object};
  });
  const plan = rotationPlan(cuts, now);
  let verifiedInventory=inventory;
  if (plan.remove.length) {
    if (!store.remove) throw new Error("Rotation pruning unavailable; preserve history and close admission");
    // Retained ciphertext must still be retrievable before any obsolete snapshot
    // deletion. Never prune journal/witnesses or infer recovery completeness here.
    for (const cut of plan.keep) await store.get(cut.object);
    for (const cut of plan.remove) await store.remove(cut.object);
    const after = await store.inventory();
    const expected=inventory.filter(f=>!plan.remove.some(c=>c.object.fileId===f.fileId));
    if (after.length!==expected.length || after.some(f=>!expected.some(e=>e.fileId===f.fileId && e.fileName===f.fileName && e.contentLength===f.contentLength)) || plan.remove.some(c => after.some(f => f.fileId === c.object.fileId)) ||
        plan.keep.some(c => !after.some(f => f.fileId === c.object.fileId)) ||
        inventory.filter(f=>!cuts.some(c=>c.object===f)).some(f=>!after.some(a=>a.fileId===f.fileId)))
      throw new Error("Rotation deletion readback failed");
    verifiedInventory=after;
  }
  // Reuse the complete all-version inventory just obtained (or the exact
  // post-delete readback), not a second equivalent list for capacity accounting.
  return {...plan,inventory:verifiedInventory};
}

export function validateBackupReceipt(value: any, now: number) {
  const o=value?.object;
  if(value?.version!==1 || !Number.isSafeInteger(value.createdAt) || value.createdAt<0 || value.createdAt>now ||
    typeof o?.fileName!=="string" || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/backups\/[0-9]+-[a-f0-9]{32}\.enc$/.test(o.fileName) ||
    o.fileName.match(/\/backups\/([0-9]+)-/)?.[1]!==String(value.createdAt) ||
    typeof o.fileId!=="string" || !o.fileId || typeof o.bucketId!=="string" || !o.bucketId ||
    !Number.isSafeInteger(o.contentLength) || o.contentLength<32 || o.contentLength>64*1024*1024 ||
    !/^[a-f0-9]{40}$/.test(o.contentSha1) || !validCut(value.observedJournalCut)) throw new Error("Invalid recovery backup receipt");
  return value;
}
function validCut(c:any) {return c && /^[a-f0-9]{32}$/.test(c.origin) && Number.isSafeInteger(c.head) && c.head>=0;}
export function validateBackupState(s:any,now:number) {
  validateBackupReceipt(s?.lastBackup,now);
  if(!Number.isSafeInteger(s.lastRemoteVerifiedAt)||s.lastRemoteVerifiedAt<0||s.lastRemoteVerifiedAt>s.lastVerifiedSync) throw new Error("Invalid remote evidence clock");
  if(s.version!==2 || !Number.isSafeInteger(s.lastVerifiedSync) || s.lastVerifiedSync<s.lastBackup.createdAt || s.lastVerifiedSync>now || !validCut(s.observedJournalCut) ||
    s.observedJournalCut.origin!==s.lastBackup.observedJournalCut.origin || s.observedJournalCut.head<s.lastBackup.observedJournalCut.head) throw new Error("Invalid recovery schedule state");
  const prefix=s.lastBackup.object.fileName.split("/backups/")[0]+"/backups/";
  const tiers=s.rotation;
  if(!Array.isArray(tiers?.daily)||tiers.daily.length<1||tiers.daily.length>7||!Array.isArray(tiers.weekly)||tiers.weekly.length<1||tiers.weekly.length>4) throw new Error("Invalid rotation evidence");
  const union=new Map<string,any>();
  for(const tier of [tiers.daily,tiers.weekly]) {
    const ids=new Set<string>();
    for(const o of tier) {
      const createdAt=Number(o?.fileName?.match(/\/backups\/([0-9]+)-/)?.[1]);
      validateBackupReceipt({version:1,createdAt,object:o,observedJournalCut:s.observedJournalCut},now);
      if(!o.fileName.startsWith(prefix)||o.bucketId!==s.lastBackup.object.bucketId||ids.has(o.fileId) || (union.has(o.fileId)&&JSON.stringify(union.get(o.fileId))!==JSON.stringify(o))) throw new Error("Conflicting rotation receipt");
      ids.add(o.fileId);union.set(o.fileId,o);
    }
  }
  if(!union.has(s.lastBackup.object.fileId)||JSON.stringify(union.get(s.lastBackup.object.fileId))!==JSON.stringify(s.lastBackup.object)) throw new Error("Backup missing from rotation evidence");
  const cuts=[...union.values()].map(object=>({object,createdAt:Number(object.fileName.match(/\/backups\/([0-9]+)-/)[1])}));
  const plan=rotationPlan(cuts,s.lastVerifiedSync);
  for(const key of ["daily","weekly"] as const) if(JSON.stringify(plan[key].map(c=>c.object))!==JSON.stringify(tiers[key])) throw new Error("Invalid calendar tier evidence");
  const c=s.capacity;
  if(!c||[c.remote,c.local,c.projected,c.total].some(n=>!Number.isSafeInteger(n)||n<0)||c.total!==c.remote+c.local+c.projected||c.total>=8000000000||c.scope!=="restricted-prefix-all-versions-plus-private-directory; NOT provider account spend cap") throw new Error("Invalid capacity evidence");
  return s;
}
function privateDB(directory: string, name: string) {
  const file = join(directory,name);
  closeSync(openSync(file,"a",0o600)); chmodSync(file,0o600);
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  return db;
}
function cycleDB(directory:string) {
  const db=privateDB(directory,"backup-cycle.sqlite");
  db.exec("CREATE TABLE IF NOT EXISTS cycle(singleton INTEGER PRIMARY KEY CHECK(singleton=1), generation INTEGER NOT NULL, highwater INTEGER NOT NULL, status TEXT NOT NULL, evidence TEXT NOT NULL) STRICT;");
  return db;
}
export function beginBackupCycle(directory:string,now:number,retryDelay=0) {
  const db=cycleDB(directory);
  try {
    db.exec("BEGIN IMMEDIATE");
    const row=db.prepare("SELECT * FROM cycle WHERE singleton=1").get();
    if(!Number.isSafeInteger(now)||now<0) throw new Error("Invalid backup cycle clock");
    if(row&&now<Number(row.highwater)) {
      // Refuse the rollback and invalidate any in-flight older publisher durably.
      durableJSON(directory,"offhost-error.json",{version:1,failedAt:Number(row.highwater),reason:"clock_rollback"});
      const parent=openSync(directory,"r");try{fsyncSync(parent);}finally{closeSync(parent);}
      db.prepare("UPDATE cycle SET generation=generation+1,status='error',evidence='' WHERE singleton=1").run();
      db.exec("COMMIT");throw new Error("Backup cycle clock rollback");
    }
    if(row && row.status!=="success" && now-Number(row.highwater)<retryDelay) throw new Error("Backup retry backoff; durable error remains closed");
    const generation=Number(row?.generation??0)+1;
    if(!Number.isSafeInteger(generation)) throw new Error("Backup cycle generation exhausted");
    db.prepare("INSERT INTO cycle VALUES(1,?,?, 'pending', '') ON CONFLICT(singleton) DO UPDATE SET generation=excluded.generation,highwater=excluded.highwater,status=excluded.status,evidence=excluded.evidence").run(generation,now);
    db.exec("COMMIT");
    const parent=openSync(directory,"r");try{fsyncSync(parent);}finally{closeSync(parent);}
    return generation;
  } finally {db.close();}
}
function durableJSON(directory:string,file:string,value:unknown) {
  const temporary=join(directory,"cycle-"+randomBytes(16).toString("hex")+".tmp");
  try {
    writeFileSync(temporary,JSON.stringify(value),{mode:0o600,flag:"wx"});
    const fd=openSync(temporary,"r");try{fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(temporary,join(directory,file));
  } finally {if(existsSync(temporary)) unlinkSync(temporary);}
}
// File publication and acknowledgement share the cross-process SQLite write lock.
// A crash before COMMIT leaves the durable pending latch, never an admitted success.
export function finishBackupCycle(directory:string,generation:number,value:any,success:boolean) {
  const db=cycleDB(directory);
  try {
    db.exec("BEGIN IMMEDIATE");
    const row=db.prepare("SELECT * FROM cycle WHERE singleton=1").get();
    if(row?.generation!==generation||row.status!=="pending") return false;
    if(success) {
      validateBackupState(value,Number(row.highwater));
      durableJSON(directory,"offhost-state.json",value);
      if(existsSync(join(directory,"offhost-error.json"))) unlinkSync(join(directory,"offhost-error.json"));
    } else durableJSON(directory,"offhost-error.json",value);
    const parent=openSync(directory,"r");try{fsyncSync(parent);}finally{closeSync(parent);}
    db.prepare("UPDATE cycle SET status=?,evidence=? WHERE singleton=1").run(success?"success":"error",success?JSON.stringify(value):"");
    db.exec("COMMIT");return true;
  } finally {db.close();}
}
export function cycleEvidenceMatches(directory:string,state:any) {
  if(!existsSync(join(directory,"backup-cycle.sqlite"))) return false;
  const db=cycleDB(directory);
  try {const row=db.prepare("SELECT * FROM cycle WHERE singleton=1").get();return row?.status==="success"&&row.evidence===JSON.stringify(state)&&row.highwater===state.lastVerifiedSync;}
  finally {db.close();}
}
function readState(file: string) {
  if (statSync(file).size > 65536) throw new Error("State exceeds bound");
  return JSON.parse(readFileSync(file,"utf8"));
}
// No provider calls, no producer invocation: executable in a separate process.
// SQLite is the durable PRIVATE alarm artifact, including sticky last failure.
export function probeBackup(directory: string, now = Date.now()) {
  const db = privateDB(directory,"backup-watchdog.sqlite");
  try {
    db.exec("CREATE TABLE IF NOT EXISTS watchdog(singleton INTEGER PRIMARY KEY CHECK(singleton=1), highwater INTEGER NOT NULL, reason TEXT NOT NULL, last_failure TEXT NOT NULL, checked_at INTEGER NOT NULL) STRICT; BEGIN IMMEDIATE;");
    const prior = db.prepare("SELECT * FROM watchdog WHERE singleton=1").get();
    let reason = "healthy";
    if (!Number.isSafeInteger(now) || now < 0 || (prior && now < Number(prior.highwater))) reason="clock_rollback";
    else {
      try {
        const state=validateBackupState(readState(join(directory,"offhost-state.json")),now);
        const sync=state.lastVerifiedSync, backup=state.lastBackup?.createdAt;
        if (state.version!==2 || !Array.isArray(state.rotation?.daily) || state.rotation.daily.length<1 || state.rotation.daily.length>7 || !Array.isArray(state.rotation?.weekly) || state.rotation.weekly.length<1 || state.rotation.weekly.length>4 || !Number.isSafeInteger(state.capacity?.total) || state.capacity.total<0 || state.capacity.total>=8000000000 || state.lastBackup?.version!==1 || !Number.isSafeInteger(sync) || !Number.isSafeInteger(backup) || backup<0 || sync<backup || sync>now || backup>now) reason="backup_state_invalid";
        else if (existsSync(join(directory,"offhost-error.json"))) reason="backup_error";
        else if (!cycleEvidenceMatches(directory,state)) reason="backup_cycle_unconfirmed";
        else if (now-sync>120000 || now-state.lastRemoteVerifiedAt>=600000 || now-backup>=DAY) reason="backup_stale";
      } catch { reason="backup_state_missing_or_invalid"; }
    }
    const highwater=Math.max(Number(prior?.highwater??0),Number.isSafeInteger(now)?now:0);
    const lastFailure=reason==="healthy"?String(prior?.last_failure??""):reason;
    db.prepare("INSERT INTO watchdog VALUES(1,?,?,?,?) ON CONFLICT(singleton) DO UPDATE SET highwater=excluded.highwater,reason=excluded.reason,last_failure=excluded.last_failure,checked_at=excluded.checked_at").run(highwater,reason,lastFailure,highwater);
    db.exec("COMMIT");
    return {admitted:reason==="healthy",reason,lastFailure,checkedAt:highwater};
  } finally { db.close(); }
}

export async function assertCapacity(inventory: StoredObject[], directory: string, projected: number) {
  const valid=(n:number)=>Number.isSafeInteger(n)&&n>=0;
  if (!valid(projected) || inventory.length>10000) throw new Error("Aggregate capacity unknown");
  const ids=new Set<string>(); let remote=0,local=0,entries=0;
  for(const f of inventory) {
    if (!f.fileId || ids.has(f.fileId) || !valid(f.contentLength)) throw new Error("Aggregate capacity inventory invalid");
    ids.add(f.fileId);remote+=f.contentLength;
  }
  async function walk(path:string) {
    if (++entries>10000) throw new Error("Local capacity enumeration exhausted");
    const s=await lstat(path);
    if (s.isSymbolicLink()) throw new Error("Local capacity symlink prohibited");
    if(s.isDirectory()) for(const name of await readdir(path)) await walk(join(path,name));
    else if(s.isFile()) local+=s.size;
    else throw new Error("Local capacity type unknown");
  }
  await walk(directory);
  const total=remote+local+projected;
  if(!valid(total)||total>=8000000000) throw new Error("Aggregate capacity exhausted");
  return {remote,local,projected,total,scope:"restricted-prefix-all-versions-plus-private-directory; NOT provider account spend cap"};
}

// Conservative local task ceilings, NOT a B2 free quota or money cap. All auth,
// inventory, readback, retries and failed requests share this durable ledger.
const DEFAULT_LIMITS={dailyRequests:1000,monthlyRequests:20000,dailyBytes:512000000,monthlyBytes:5000000000};
export function reserveRequest(directory:string,now:number,bytes:number,limits=DEFAULT_LIMITS) {
  if(!Number.isSafeInteger(now)||now<0||!Number.isSafeInteger(bytes)||bytes<0||Object.values(limits).some(n=>!Number.isSafeInteger(n)||n<1)) throw new Error("Invalid request budget");
  const db=privateDB(directory,"backup-budget.sqlite");
  try {
    db.exec("CREATE TABLE IF NOT EXISTS clock(singleton INTEGER PRIMARY KEY CHECK(singleton=1),highwater INTEGER NOT NULL) STRICT; CREATE TABLE IF NOT EXISTS budget(period TEXT PRIMARY KEY, requests INTEGER NOT NULL, bytes INTEGER NOT NULL) STRICT; BEGIN IMMEDIATE;");
    const prior=db.prepare("SELECT highwater FROM clock WHERE singleton=1").get();
    if(prior&&now<Number(prior.highwater)) throw new Error("Request budget clock rollback");
    const date=new Date(now).toISOString();
    const periods=[[date.slice(0,10),limits.dailyRequests,limits.dailyBytes],[date.slice(0,7),limits.monthlyRequests,limits.monthlyBytes]] as const;
    for(const [period,count,maxBytes] of periods) {
      const used=db.prepare("SELECT * FROM budget WHERE period=?").get(period);
      if(Number(used?.requests??0)+1>count||Number(used?.bytes??0)+bytes>maxBytes) throw new Error("Aggregate request/transfer budget exhausted");
      db.prepare("INSERT INTO budget VALUES(?,1,?) ON CONFLICT(period) DO UPDATE SET requests=requests+1,bytes=bytes+excluded.bytes").run(period,bytes);
    }
    db.prepare("INSERT INTO clock VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET highwater=excluded.highwater").run(now);
    // Bounded history. Only old periods; highwater prevents clock-reset reuse.
    db.prepare("DELETE FROM budget WHERE period<?").run(date.slice(0,7));
    db.exec("COMMIT");
  } finally {db.close();}
}
