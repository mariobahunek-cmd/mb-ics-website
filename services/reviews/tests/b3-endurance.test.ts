import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import * as api from '../src/offhost.ts';
import * as ops from '../src/backup-operations.ts';
import {fixture} from './helpers/fixture.ts';
import {syncRecovery} from '../src/recovery.ts';
import {provider} from './helpers/b3-provider.ts';
const DAY=86400000;
async function setup(run:(f:ReturnType<typeof fixture>,base:ReturnType<typeof provider>,d:string)=>Promise<void>){
 const d=await mkdtemp(join(tmpdir(),'b3-')),f=fixture(),identity=join(d,'synthetic.age');
 assert.equal(spawnSync('age-keygen',['-o',identity]).status,0);
 const recipient=spawnSync('age-keygen',['-y',identity],{encoding:'utf8'}).stdout.trim();
 try{await run(f,provider(recipient),d);}finally{f.db.close();await rm(d,{recursive:true,force:true});}
}
// Original independent B3 scenario: one prior withdrawal, 31 UTC days, every
// ten-minute boundary, actual guarded writer/pruner, probe after every cycle.
// Extend it with eight retained versions and real changing source cuts; no
// journal deletion, quota reset or unmetered pruner in either scenario.
for(const versions of [1,8]) test(`B3 full 31-day unchanged nonempty journal with ${versions} retained versions and subsequent source cuts`,async()=>setup(async(f,base,d)=>{
 let now=Date.UTC(2026,9,1);
 const p=provider(base.config.recipient,d,()=>now);
 const pruner=api.b2BackupPruner({...p.config,keyId:'pruner-synthetic'},p.transport as any,d,()=>now);
 const store={...p.store,remove:pruner.remove};
 const insert=(n:number)=>f.db.prepare("INSERT INTO recovery_events VALUES(?,'withdrawn',?,0,0)").run(n,`previous-withdrawal-${n}`);
 for(let n=1;n<=versions;n++) {insert(n);await syncRecovery(f.db,api.b2RecoveryJournal(store,d));}
 let cycles=0,head=versions;
 for(let day=0;day<31;day++) for(let minute=0;minute<1440;minute+=10) {
  if(versions>1&&minute===10&&(day===10||day===20)) insert(++head);
  // New producer factory every cycle exercises durable evidence rather than a
  // producer-local memo. Adapter reservations and default quotas are untouched.
  await api.createRecoveryCycle(f.db,store,d,()=>now)();cycles++;
  assert.equal(ops.probeBackup(d,now).admitted,true,`day=${day} minute=${minute}`);
  assert.equal(JSON.parse(await readFile(join(d,'offhost-state.json'),'utf8')).observedJournalCut.head,head);
  now+=600000;
 }
 assert.equal(cycles,4464);
 assert.equal(p.files.filter(x=>x.fileName.includes('/journal/')).length,head);
 const witness=new DatabaseSync(join(d,'offhost-witness.sqlite'));
 try{assert.equal(witness.prepare('SELECT count(*) n FROM witness WHERE confirmed=1').get()!.n,head);}finally{witness.close();}
 const ledger=new DatabaseSync(join(d,'backup-budget.sqlite'));let rows:any[];
 try{rows=ledger.prepare('SELECT * FROM budget').all();}finally{ledger.close();}
 assert.ok(rows.filter(x=>x.period.length===7).every(x=>x.requests<=20000&&x.bytes<=5000000000));
 assert.ok(rows.filter(x=>x.period.length===10).every(x=>x.requests<=1000&&x.bytes<=512000000));
 console.log(JSON.stringify({proof:'B3 checked-in full-month regression',versions,head,cycles,calls:p.calls,monthly:rows.filter(x=>x.period.length===7)}));
}));

test('B3 eligibility captured before an async source change cannot reuse old-version download evidence',async()=>setup(async(f,base,d)=>{
 let now=Date.UTC(2026,9,1);const p=provider(base.config.recipient,d,()=>now);
 f.db.prepare("INSERT INTO recovery_events VALUES(1,'withdrawn','before',0,0)").run();
 await api.createRecoveryCycle(f.db,p.store,d,()=>now)();
 const state=JSON.parse(await readFile(join(d,'offhost-state.json'),'utf8'));
 const original=p.files.find(x=>x.fileName.includes('/journal/'))!;
 f.db.prepare("INSERT INTO recovery_events VALUES(2,'redacted','during-async-work',0,0)").run();
 let oldDownloads=0;now+=60000;
 const store={...p.store,get:async(r:api.ObjectReceipt)=>{if(r.fileId===original.fileId)oldDownloads++;return p.store.get(r);}};
 await syncRecovery(f.db,api.b2RecoveryJournal(store,d,undefined,{now,verifiedBefore:state.lastVerifiedSync,sourceCut:state.observedJournalCut} as any));
 assert.ok(oldDownloads>=2,`source changed after eligibility capture: oldDownloads=${oldDownloads}`);
}));

test('B3 durable receipt reuse retains absolute byte-verification age and verifies all versions at expiry',async()=>setup(async(f,base,d)=>{
 const initial=Date.UTC(2026,9,1);let now=initial;const p=provider(base.config.recipient,d,()=>now);
 for(let n=1;n<=3;n++) {f.db.prepare("INSERT INTO recovery_events VALUES(?,'withdrawn',?,0,0)").run(n,`privacy-${n}`);await syncRecovery(f.db,api.b2RecoveryJournal(p.store,d));}
 const run=()=>api.createRecoveryCycle(f.db,api.b2RecoveryStore(p.config,p.transport as any,d,()=>now),d,()=>now)();
 await run();
 const journalIds=new Set(p.files.filter(x=>x.fileName.includes('/journal/')).map(x=>x.fileId));
 const downloads=(start:number)=>p.requests.slice(start).filter(x=>x.url.includes('b2_download_file_by_id')&&journalIds.has(new URL(x.url).searchParams.get('fileId')!)).length;
 const cache=()=>{const db=new DatabaseSync(join(d,'offhost-witness.sqlite'));try{return db.prepare('SELECT * FROM verified_receipt ORDER BY receipt').all();}finally{db.close();}};
 const original=cache();assert.equal(original.length,3);
 for(let tick=1;tick<144;tick++) {now=initial+tick*600000;const start=p.calls;await run();assert.equal(downloads(start),0);assert.deepEqual(cache(),original);}
 now=initial+DAY;const start=p.calls;await run();assert.ok(downloads(start)>=3);
 assert.ok(cache().every(r=>r.checked_at===now));
}));

for(const failure of ['missing-version','changed-receipt','witness-conflict','journal-byte-outage','remote-outage','crash-pending'] as const)
 test(`B3 cached proof fails closed on ${failure} and verified restart alone recovers`,async()=>setup(async(f,base,d)=>{
 const initial=Date.UTC(2026,9,1);let now=initial;const p=provider(base.config.recipient,d,()=>now);
 for(let n=1;n<=2;n++) {f.db.prepare("INSERT INTO recovery_events VALUES(?,'withdrawn',?,0,0)").run(n,`privacy-${n}`);await syncRecovery(f.db,api.b2RecoveryJournal(p.store,d));}
 const run=(transport=p.transport)=>api.createRecoveryCycle(f.db,api.b2RecoveryStore(p.config,transport as any,d,()=>now),d,()=>now)();
 await run();const first=p.files.find(x=>x.fileName.includes('/journal/'))!,original={...first};
 now+=600000;
 if(failure==='missing-version') p.files.splice(p.files.indexOf(first),1);
 if(failure==='changed-receipt') first.contentSha1='a'.repeat(40);
 if(failure==='witness-conflict') {const db=new DatabaseSync(join(d,'offhost-witness.sqlite'));try{db.prepare("UPDATE witness SET payload=? WHERE head=1").run('a'.repeat(64));}finally{db.close();}}
 if(failure==='remote-outage')p.outage=true;
 let blockedJournalDownloads=0;
 const broken=async(input:any,init:any)=>{if(String(input).includes('b2_download_file_by_id')&&new URL(String(input)).searchParams.get('fileId')===first.fileId){blockedJournalDownloads++;throw Error('journal-only outage');}return p.transport(input,init);};
 if(failure==='journal-byte-outage') {
  await run(broken);assert.equal(blockedJournalDownloads,0,'bounded exact-receipt reuse does not fabricate a fresh byte GET');
  now=initial+DAY;
 }
 if(failure==='crash-pending') {
  ops.beginBackupCycle(d,now,600000);now+=600000;
  await assert.rejects(()=>run(broken),/journal-only outage/);
 } else await assert.rejects(()=>run(failure==='journal-byte-outage'?broken:p.transport),/missing|integrity|conflict|outage/);
 assert.equal(ops.probeBackup(d,now).admitted,false);
 const before=p.calls;now+=60000;await assert.rejects(()=>run(),/backoff/);assert.equal(p.calls,before);
 if(failure==='witness-conflict')return; // Never repair a deliberately corrupt witness in place.
 if(failure==='missing-version')p.files.push(original);
 if(failure==='changed-receipt')Object.assign(first,original);
 p.outage=false;now+=600000;
 let journalReads=0;const observing=async(input:any,init:any)=>{if(String(input).includes('b2_download_file_by_id')&&new URL(String(input)).searchParams.get('fileId')===first.fileId)journalReads++;return p.transport(input,init);};
 await run(observing);assert.ok(journalReads>=1,'error/pending cannot recover from cached bytes');
 assert.equal(ops.probeBackup(d,now).admitted,true);
}));

test('B3 exhausted default monthly reservations survive adapter restart and recover next month without ledger reset',async()=>setup(async(f,base,d)=>{
 const initial=Date.UTC(2026,9,1);let now=initial;const p=provider(base.config.recipient,d,()=>now);
 f.db.prepare("INSERT INTO recovery_events VALUES(1,'withdrawn','retained',0,0)").run();
 const run=()=>{
  // Keep the composed pruning capability on the bound store, not on the
  // writer-only RecoveryStore argument's excess-property literal surface.
  const store={...api.b2RecoveryStore(p.config,p.transport as any,d,()=>now),remove:api.b2BackupPruner({...p.config,keyId:'pruner-synthetic'},p.transport as any,d,()=>now).remove};
  return api.createRecoveryCycle(f.db,store,d,()=>now)();
 };
 await run();
 // Account for other failed/pre-transport reserved work without inventing HTTP
 // responses or resetting any ledger. Consume the real unchanged default guard.
 for(let day=0;day<20;day++) {
  now=initial+day*DAY;const db=new DatabaseSync(join(d,'backup-budget.sqlite'));let used:number;
  try{used=Number(db.prepare('SELECT requests FROM budget WHERE period=?').get(new Date(now).toISOString().slice(0,10))?.requests??0);}finally{db.close();}
  for(;used<1000;used++)ops.reserveRequest(d,now,0);
 }
 now=initial+20*DAY;const before=p.calls;
 await assert.rejects(()=>run(),/budget exhausted/);assert.equal(p.calls,before);assert.equal(ops.probeBackup(d,now).admitted,false);
 now+=600000;await assert.rejects(()=>run(),/budget exhausted/);assert.equal(p.calls,before);
 const db=new DatabaseSync(join(d,'backup-budget.sqlite'));
 try{assert.equal(db.prepare("SELECT requests FROM budget WHERE period='2026-10'").get()!.requests,20000);}finally{db.close();}
 now=Date.UTC(2026,10,1);await run();assert.equal(ops.probeBackup(d,now).admitted,true);
 assert.equal(JSON.parse(await readFile(join(d,'offhost-state.json'),'utf8')).observedJournalCut.head,1);
 assert.equal(p.files.filter(x=>x.fileName.includes('/journal/')).length,1);
}));
