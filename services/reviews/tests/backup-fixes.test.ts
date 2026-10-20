import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as api from '../src/offhost.ts';
import * as ops from '../src/backup-operations.ts';
import {fixture} from './helpers/fixture.ts';
const DAY=86400000;
export function provider(recipient:string,directory?:string,clock=Date.now){
 const files:any[]=[];let n=0,calls=0;
 const config={keyId:'fixture',applicationKey:'fixture',bucketId:'fixture',prefix:'reviews/',recipient};
 const j=(x:any)=>new Response(JSON.stringify(x));
 const transport=async(input:any,init:any={})=>{
 calls++;const url=String(input);
 if(url.endsWith('b2_authorize_account')){const pruning=new Headers(init.headers).get('Authorization')==='Basic '+Buffer.from('pruner-fixture:fixture').toString('base64');return j({accountId:'fixture',authorizationToken:pruning?'pruner-fixture':'fixture',apiInfo:{storageApi:{apiUrl:'https://api001.backblazeb2.com',downloadUrl:'https://f001.backblazeb2.com',allowed:{buckets:[{id:'fixture'}],namePrefix:pruning?'reviews/backups/':'reviews/',capabilities:pruning?['listFiles','readFiles','deleteFiles']:['listFiles','readFiles','writeFiles','listBuckets','readBucketRetentions']}}}});}
 if(url.endsWith('b2_delete_file_version')){assert.equal(new Headers(init.headers).get('Authorization'),'pruner-fixture');const b=JSON.parse(init.body);const i=files.findIndex(f=>f.fileId===b.fileId&&f.fileName===b.fileName);assert.ok(i>=0);files.splice(i,1);return j(b);}
 if(url.endsWith('b2_list_buckets'))return j({buckets:[{bucketId:'fixture',bucketType:'allPrivate',fileLockConfiguration:{isClientAuthorizedToRead:true,value:{isFileLockEnabled:false}},lifecycleRules:[{fileNamePrefix:'reviews/backups/',daysFromUploadingToHiding:27,daysFromHidingToDeleting:1}]}]});
 if(url.endsWith('b2_get_upload_url'))return j({uploadUrl:'https://pod-001.backblaze.com/b2api/v4/b2_upload_file/fixture',authorizationToken:'fixture'});
 if(url.includes('b2_upload_file/')){const h=new Headers(init.headers),body=Buffer.from(init.body);const f={fileId:String(++n),fileName:decodeURIComponent(h.get('X-Bz-File-Name')!),bucketId:'fixture',contentLength:body.length,contentSha1:createHash('sha1').update(body).digest('hex'),action:'upload',body};files.push(f);return j({...f,body:undefined});}
 if(url.endsWith('b2_list_file_versions')){const b=JSON.parse(init.body);return j({files:files.filter(f=>f.fileName.startsWith(b.prefix)).map(({body,...f})=>f),nextFileName:null,nextFileId:null});}
 if(url.includes('b2_download_file_by_id')){const f=files.find(f=>f.fileId===new URL(url).searchParams.get('fileId'));return f?new Response(f.body):new Response('',{status:404});}
 throw Error('unexpected fixture request');
 };return {files,transport,config,get calls(){return calls;},store:api.b2RecoveryStore(config,transport as any,directory,clock)};
}
async function setup(run:(f:ReturnType<typeof fixture>,p:ReturnType<typeof provider>,d:string)=>Promise<void>){
 const d=await mkdtemp(join(tmpdir(),'backup-fix-')),f=fixture();
 const identity=join(d,'fixture.age');assert.equal(spawnSync('age-keygen',['-o',identity]).status,0);
 const recipient=spawnSync('age-keygen',['-y',identity],{encoding:'utf8'}).stdout.trim();
 try{await run(f,provider(recipient),d);}finally{f.db.close();await rm(d,{recursive:true,force:true});}
}
test('B1 independent reproduction: altered scheduler age cannot launder old exact ciphertext',async()=>setup(async(f,p,d)=>{
 let now=f.ctx.now();await api.createRecoveryCycle(f.db,p.store,d,()=>now)();
 const state=JSON.parse(await readFile(join(d,'offhost-state.json'),'utf8'));
 now+=2*DAY;state.lastBackup.createdAt=now;await writeFile(join(d,'offhost-state.json'),JSON.stringify(state));
 await assert.rejects(()=>api.createRecoveryCycle(f.db,p.store,d,()=>now)(),/receipt|schedule/i);
 assert.equal(ops.probeBackup(d,now).admitted,false);
}));
for(const failure of [false,true]) test(`B2 independent reproduction: older completion cannot ${failure?'clear newer failure':'regress newer success'}`,async()=>setup(async(f,p,d)=>{
 const initial=f.ctx.now();await api.createRecoveryCycle(f.db,p.store,d,()=>initial)();
 let pause!:()=>void,release!:()=>void;
 const paused=new Promise<void>(r=>pause=r),resume=new Promise<void>(r=>release=r);
 // Pause the final aggregate observation, not a redundant second inventory.
 // The full observation is still old when a newer generation completes/fails.
 const delayed={...p.store,inventory:async()=>{const v=await p.store.inventory();pause();await resume;return v;}};
 const older=api.createRecoveryCycle(f.db,delayed,d,()=>initial+60000)();await paused;
 if(failure) await assert.rejects(()=>api.createRecoveryCycle(f.db,{...p.store,get:async()=>{throw Error('newer readback failure');}},d,()=>initial+60001)(),/newer readback failure/);
 else await api.createRecoveryCycle(f.db,p.store,d,()=>initial+60001)();
 const before=await readFile(join(d,'offhost-state.json'),'utf8');release();await older;
 assert.equal(await readFile(join(d,'offhost-state.json'),'utf8'),before);
 assert.equal(ops.probeBackup(d,initial+60001).admitted,!failure);
 if(failure) assert.ok(await readFile(join(d,'offhost-error.json')));
}));
test('default guarded adapter sustains 35 quiet days: first day minute cadence then every reconciliation boundary',async()=>setup(async(f,base,d)=>{
 let now=Date.UTC(2026,9,1);const p=provider(base.config.recipient,d,()=>now);
 const pruner=api.b2BackupPruner({...p.config,keyId:'pruner-fixture'},p.transport as any,d,()=>now);
 const store={...p.store,remove:pruner.remove}; // actual exact-version adapter, synthetic separately-scoped HTTP credential only
 const cycle=api.createRecoveryCycle(f.db,store,d,()=>now),metrics:any[]=[];
 const {DatabaseSync}=await import('node:sqlite');
 for(let day=0;day<35;day++) {
  for(let minute=0;minute<1440;minute+=day===0?1:10) {
   await cycle();assert.equal(ops.probeBackup(d,now).admitted,true,`day=${day} minute=${minute}`);now+=day===0?60000:600000;
  }
  const ledger=new DatabaseSync(join(d,'backup-budget.sqlite'));
  try {metrics.push(...ledger.prepare('SELECT * FROM budget').all());}finally{ledger.close();}
 }
 assert.equal(p.files.filter(x=>x.fileName.includes('/backups/')).length<=11,true);
 assert.ok(p.calls<30000,`bounded calls: ${p.calls}`);
 const daily=metrics.filter(x=>x.period.length===10),monthly=metrics.filter(x=>x.period.length===7);
 const peak={dailyRequests:Math.max(...daily.map(x=>x.requests)),monthlyRequests:Math.max(...monthly.map(x=>x.requests)),dailyBytes:Math.max(...daily.map(x=>x.bytes)),monthlyBytes:Math.max(...monthly.map(x=>x.bytes))};
 assert.ok(peak.dailyRequests<=1000&&peak.monthlyRequests<=20000&&peak.dailyBytes<=512000000&&peak.monthlyBytes<=5000000000);
 console.log(JSON.stringify({proof:'35-day bounded guarded writer and actual pruner adapters',calls:p.calls,days:35,minuteCadenceDays:1,reconciliationBoundaryDays:34,peak}));
}));
test('failed guarded cycles back off durably across restart, keep admission closed and recover only after verification',async()=>setup(async(f,base,d)=>{
 let now=f.ctx.now();const p=provider(base.config.recipient,d,()=>now);await api.createRecoveryCycle(f.db,p.store,d,()=>now)();
 const start=p.calls;let failedCalls=0;
 for(let i=0;i<1440;i++) {
   now+=60000;
   const broken=api.b2RecoveryStore(p.config,(async()=>{failedCalls++;throw Error('outage');}) as any,d,()=>now);
   try {await api.createRecoveryCycle(f.db,broken,d,()=>now)();}catch{}
   if(i>=10) assert.equal(ops.probeBackup(d,now).admitted,false);
 }
 assert.ok(failedCalls<=145,`outage calls=${failedCalls}`);
 now+=600000;await api.createRecoveryCycle(f.db,p.store,d,()=>now)();assert.equal(ops.probeBackup(d,now).admitted,true);
 console.log(JSON.stringify({proof:'24h failure with restarted adapters',failedCalls,initialCalls:start}));
}));
test('B2 independent processes: crash-pending latch rejects stale publication and only a new verified cycle recovers',async()=>setup(async(f,p,d)=>{
 const now=f.ctx.now();await api.createRecoveryCycle(f.db,p.store,d,()=>now)();
 const state=JSON.parse(await readFile(join(d,'offhost-state.json'),'utf8'));
 const module=new URL('../src/backup-operations.ts',import.meta.url).href;
 const child=(code:string)=>{const r=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',`import * as o from ${JSON.stringify(module)};${code}`],{encoding:'utf8',env:process.env});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};
 const older=child(`console.log(o.beginBackupCycle(${JSON.stringify(d)},${now+1}));`);
 const newer=child(`console.log(o.beginBackupCycle(${JSON.stringify(d)},${now+2}));`);
 assert.equal(ops.probeBackup(d,now+2).admitted,false,'crashed producer leaves pending latch');
 assert.equal(child(`console.log(o.finishBackupCycle(${JSON.stringify(d)},${older},${JSON.stringify({...state,lastVerifiedSync:now+1})},true));`),false);
 child(`console.log(o.finishBackupCycle(${JSON.stringify(d)},${newer},{version:1,failedAt:${now+2},reason:'failure'},false));`);
 assert.equal(ops.probeBackup(d,now+2).admitted,false);
 assert.equal(child(`console.log(o.finishBackupCycle(${JSON.stringify(d)},${older},${JSON.stringify({...state,lastVerifiedSync:now+1})},true));`),false);
 await api.createRecoveryCycle(f.db,p.store,d,()=>now+3)();assert.equal(ops.probeBackup(d,now+3).admitted,true);
}));
test('quiet cache never postpones a changed privacy source cut and remote error cannot be acknowledged by cache',async()=>setup(async(f,base,d)=>{
 let now=f.ctx.now();const p=provider(base.config.recipient,d,()=>now);const cycle=api.createRecoveryCycle(f.db,p.store,d,()=>now);
 await cycle();const before=p.calls;now+=60000;await cycle();assert.equal(p.calls,before);
 f.db.prepare("INSERT INTO recovery_events(sequence,kind,object_id,count,expires_at) VALUES(1,'withdrawn','fixture-private',0,0)").run();
 now+=60000;await cycle();assert.ok(p.calls>before);assert.equal(JSON.parse(await readFile(join(d,'offhost-state.json'),'utf8')).observedJournalCut.head,1);
 now+=600000;const broken={...p.store,get:async()=>{throw Error('readback outage');}};
 await assert.rejects(()=>api.createRecoveryCycle(f.db,broken,d,()=>now)(),/readback outage/);
 assert.equal(ops.probeBackup(d,now).admitted,false);
 now+=60000;await assert.rejects(()=>api.createRecoveryCycle(f.db,p.store,d,()=>now)(),/backoff/);assert.equal(ops.probeBackup(d,now).admitted,false);
}));
test('separate real B2 pruning adapter sends exact-version deletes only for obsolete backups; journal and retained cuts survive',async()=>setup(async(f,p,d)=>{
 const factory=(api as any).b2BackupPruner;assert.equal(typeof factory,'function','real separate pruning adapter missing');
 const body=Buffer.from('age-encryption.org/v1\nsynthetic-encrypted-fixture');
 for(let i=1;i<=40;i++)p.files.push({fileId:String(i),fileName:`reviews/backups/${i*DAY}-${'a'.repeat(32)}.enc`,bucketId:'fixture',contentLength:body.length,contentSha1:createHash('sha1').update(body).digest('hex'),action:'upload',body});
 p.files.push({...p.files[0],fileId:'journal',fileName:'reviews/journal/history'});
 const deletes:any[]=[];let loseAck=true;
 const transport=async(input:any,init:any={})=>{
  if(String(input).endsWith('b2_authorize_account'))return new Response(JSON.stringify({accountId:'fixture',authorizationToken:'fixture',apiInfo:{storageApi:{apiUrl:'https://api001.backblazeb2.com',downloadUrl:'https://f001.backblazeb2.com',allowed:{buckets:[{id:'fixture'}],namePrefix:'reviews/backups/',capabilities:['listFiles','readFiles','deleteFiles']}}}}));
  if(String(input).endsWith('b2_delete_file_version')){const b=JSON.parse(init.body);deletes.push(b);assert.deepEqual(Object.keys(b).sort(),['fileId','fileName']);assert.notEqual(b.fileId,'journal');p.files.splice(p.files.findIndex(o=>o.fileId===b.fileId&&o.fileName===b.fileName),1);if(loseAck){loseAck=false;throw Error('delete ACK lost');}return new Response(JSON.stringify(b));}
  return p.transport(input,init);
 };
 const pruner=factory(p.config,transport,d,()=>40*DAY);
 await assert.rejects(()=>factory(p.config,p.transport,d,()=>40*DAY).inventory(),/restricted/);
 assert.equal('put' in pruner,false,'separate pruner must not expose upload');
 const retained=p.files.find(o=>o.fileId==='40');retained.body=Buffer.from('corrupt');
 await assert.rejects(()=>ops.rotateBackups(pruner,40*DAY),/integrity/);assert.equal(deletes.length,0);retained.body=body;
 await assert.rejects(()=>ops.rotateBackups(pruner,40*DAY),/ACK lost/);
 const plan=await ops.rotateBackups(factory(p.config,transport,d,()=>40*DAY),40*DAY);
 assert.equal(plan.daily.length,7);assert.equal(plan.weekly.length,4);assert.ok(p.files.some(o=>o.fileId==='journal'));assert.ok(deletes.length>0);
 await assert.rejects(()=>pruner.remove(p.files.find(o=>o.fileId==='journal')),/receipt|prefix|scope/i);
 await assert.rejects(()=>pruner.remove(plan.keep[0].object),/retained/i);
 assert.ok(!('remove' in p.store),'online writer remains without delete');
}));
test('B1 producer rejects incomplete tier sources rather than silently trusting or republishing them',async()=>setup(async(f,p,d)=>{
 const now=f.ctx.now();await api.createRecoveryCycle(f.db,p.store,d,()=>now)();
 const s=JSON.parse(await readFile(join(d,'offhost-state.json'),'utf8'));s.rotation.daily=[null];await writeFile(join(d,'offhost-state.json'),JSON.stringify(s));
 await assert.rejects(()=>api.createRecoveryCycle(f.db,p.store,d,()=>now+1)(),/receipt|rotation/i);assert.equal(ops.probeBackup(d,now+1).admitted,false);
}));
test('B1 independent reproduction: partial receipt and tier evidence closes admission',async()=>setup(async(f,p,d)=>{
 const now=f.ctx.now();await writeFile(join(d,'offhost-state.json'),JSON.stringify({version:2,lastVerifiedSync:now,lastBackup:{version:1,createdAt:now},rotation:{daily:[null],weekly:['not-a-receipt']},capacity:{total:0}}));
 assert.equal(ops.probeBackup(d,now).admitted,false);
}));
