import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fixture } from './helpers/fixture.ts';
import { backupDatabase } from '../src/operations.ts';
import { probeBackup, rotationPlan } from '../src/backup-operations.ts';

// Explicit synthetic HTTP boundary; real age, SQLite, quotas, rotation and fsync.
function syntheticProvider() {
  const files:any[]=[]; const deletes:any[]=[]; let n=0;
  const json=(v:any)=>new Response(JSON.stringify(v));
  const transport=async(input:any,init:any={})=>{
    const url=String(input), headers=new Headers(init.headers);
    const prune=headers.get('Authorization')==='Basic '+Buffer.from('pruner-fixture:pruner-secret-fixture').toString('base64');
    if(url.endsWith('b2_authorize_account')) return json({accountId:'fixture',authorizationToken:prune?'pruner-fixture':'writer-fixture',apiInfo:{storageApi:{apiUrl:'https://api001.backblazeb2.com',downloadUrl:'https://f001.backblazeb2.com',allowed:{buckets:[{id:'fixture'}],namePrefix:prune?'reviews/backups/':'reviews/',capabilities:prune?['listFiles','readFiles','deleteFiles']:['listFiles','readFiles','writeFiles','listBuckets','readBucketRetentions']}}}});
    if(url.endsWith('b2_delete_file_version')) {
      assert.equal(headers.get('Authorization'),'pruner-fixture');
      const target=JSON.parse(init.body); assert.ok(target.fileName.startsWith('reviews/backups/'));
      const i=files.findIndex(f=>f.fileId===target.fileId&&f.fileName===target.fileName);assert.ok(i>=0);
      deletes.push(target);files.splice(i,1);return json(target);
    }
    if(url.endsWith('b2_list_buckets')) return json({buckets:[{bucketId:'fixture',bucketType:'allPrivate',fileLockConfiguration:{isClientAuthorizedToRead:true,value:{isFileLockEnabled:false}},lifecycleRules:[{fileNamePrefix:'reviews/backups/',daysFromUploadingToHiding:27,daysFromHidingToDeleting:1}]}]});
    if(url.endsWith('b2_get_upload_url')) {assert.equal(headers.get('Authorization'),'writer-fixture');return json({uploadUrl:'https://pod-001.backblaze.com/b2api/v4/b2_upload_file/fixture',authorizationToken:'writer-fixture'});}
    if(url.includes('b2_upload_file/')) {assert.equal(headers.get('Authorization'),'writer-fixture');const body=Buffer.from(init.body),f={fileId:String(++n),fileName:decodeURIComponent(headers.get('X-Bz-File-Name')!),bucketId:'fixture',contentLength:body.length,contentSha1:createHash('sha1').update(body).digest('hex'),action:'upload',body};files.push(f);return json({...f,body:undefined});}
    if(url.endsWith('b2_list_file_versions')) {const b=JSON.parse(init.body);return json({files:files.filter(f=>f.fileName.startsWith(b.prefix)).map(({body,...f})=>f),nextFileName:null,nextFileId:null});}
    if(url.includes('b2_download_file_by_id')) {const f=files.find(f=>f.fileId===new URL(url).searchParams.get('fileId'));return f?new Response(f.body):new Response('',{status:404});}
    throw Error('Unexpected synthetic provider request');
  };
  return {files,deletes,transport};
}
async function withRecovery(run:(directory:string, recipient:string)=>Promise<void>) {
  const directory=await mkdtemp(join(tmpdir(),'offhost-binding-'));
  try {
    const identity=join(directory,'synthetic.age');
    assert.equal(spawnSync('age-keygen',['-o',identity]).status,0);
    const recipient=spawnSync('age-keygen',['-y',identity],{encoding:'utf8'}).stdout.trim();
    await run(directory,recipient);
  } finally {await rm(directory,{recursive:true,force:true});}
}

const env = {
  REVIEWS_MODE: 'production', REVIEWS_RECOVERY_PROVIDER: 'b2',
  REVIEWS_B2_KEY_ID: 'writer-fixture', REVIEWS_B2_APPLICATION_KEY: 'writer-secret-fixture',
  REVIEWS_B2_BUCKET_ID: 'fixture', REVIEWS_B2_PREFIX: 'reviews/',
  REVIEWS_BACKUP_RECIPIENT: 'age1' + 'q'.repeat(58),
};
async function bindingModule() {
  // A missing feature is an assertion failure, not an unresolved static import.
  const module = await import('../src/offhost-binding.ts').catch(() => null);
  assert.ok(module, 'shared server/CLI offhost binding must exist');
  return module;
}
test('online binding rejects partial or reused pruning credentials and inherits writer scope', async () => {
  const { recoveryBinding } = await bindingModule();
  assert.equal(recoveryBinding({}), null);
  assert.equal(recoveryBinding(env)!.pruner, null, 'no automatic new capability');
  assert.throws(() => recoveryBinding({...env, REVIEWS_B2_PRUNE_KEY_ID:'pruner-fixture'}));
  assert.throws(() => recoveryBinding({...env, REVIEWS_B2_PRUNE_APPLICATION_KEY:'pruner-secret-fixture'}));
  assert.throws(() => recoveryBinding({...env, REVIEWS_B2_PRUNE_KEY_ID:env.REVIEWS_B2_KEY_ID, REVIEWS_B2_PRUNE_APPLICATION_KEY:'different'}));
  assert.throws(() => recoveryBinding({...env, REVIEWS_B2_PRUNE_KEY_ID:'different', REVIEWS_B2_PRUNE_APPLICATION_KEY:env.REVIEWS_B2_APPLICATION_KEY}));
  assert.throws(() => recoveryBinding({REVIEWS_B2_PRUNE_KEY_ID:'pruner-fixture',REVIEWS_B2_PRUNE_APPLICATION_KEY:'pruner-secret-fixture'}));
  const result = recoveryBinding({...env, REVIEWS_B2_PRUNE_KEY_ID:'pruner-fixture',REVIEWS_B2_PRUNE_APPLICATION_KEY:'pruner-secret-fixture'})!;
  assert.equal(result.pruner!.bucketId, result.writer.bucketId);
  assert.equal(result.pruner!.prefix, result.writer.prefix);
  assert.equal(result.pruner!.recipient, result.writer.recipient);
});

test('bound cycle really prunes through a separate principal and keeps writer encrypt-only', async () => withRecovery(async (directory, recipient) => {
  const module = await bindingModule();
  assert.equal(typeof module.boundRecoveryCycle, 'function', 'server/CLI cycle must bind optional pruner');
  const f=fixture(), p=syntheticProvider();let now=Date.UTC(2026,8,1);
  const binding=module.recoveryBinding({...env,REVIEWS_BACKUP_RECIPIENT:recipient,REVIEWS_B2_PRUNE_KEY_ID:'pruner-fixture',REVIEWS_B2_PRUNE_APPLICATION_KEY:'pruner-secret-fixture'})!;
  try {
    for(let day=0;day<35;day++) {
      // New instance models restarts; the same durable budgets and generation remain.
      await module.boundRecoveryCycle(f.db,binding,directory,p.transport as typeof fetch,()=>now)();
      assert.equal(probeBackup(directory,now).admitted,true);
      now+=86400000;
    }
    assert.ok(p.deletes.length>0,'integration must issue real adapter delete requests on synthetic transport');
    const cuts=p.files.filter(f=>f.fileName.startsWith('reviews/backups/')).map(object=>({object,createdAt:Number(object.fileName.match(/\/backups\/([0-9]+)-/)![1])}));
    const plan=rotationPlan(cuts,now-86400000);
    assert.equal(plan.remove.length,0);
    const {b2RecoveryStore}=await import('../src/offhost.ts');
    const writer=b2RecoveryStore(binding.writer,p.transport as typeof fetch,directory,()=>now);
    assert.equal('remove' in writer,false);
    assert.equal('readPlaintext' in writer,false);
    assert.equal('readVerified' in writer,false);
    const state=JSON.parse(await readFile(join(directory,'offhost-state.json'),'utf8'));
    assert.ok(state.rotation.daily.length>0&&state.rotation.weekly.length>0);
  } finally {f.db.close();}
}));

test('actual operations CLI binds optional pruner across 35 guarded daily cycles', async () => withRecovery(async (directory,recipient) => {
  const f=fixture(), source=join(directory,'reviews.sqlite');
  try {await backupDatabase(f.db,source);} finally {f.db.close();}
  const cli=new URL('../scripts/operations.ts',import.meta.url).href;
  const code=`import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
    const p=(${syntheticProvider.toString()})();globalThis.fetch=p.transport;
    let now=Date.UTC(2026,8,1);Date.now=()=>now;
    for(let day=0;day<35;day++) {
      process.argv=[process.execPath,'operations.ts','offhost-cycle',${JSON.stringify(source)},${JSON.stringify(directory)}];
      await import(${JSON.stringify(cli)}+'?day='+day);
      if(process.exitCode) break;
      now+=86400000;
    }
    console.log(JSON.stringify({proof:'actual-cli-pruning',deletes:p.deletes.length}));`;
  const r=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',code],{encoding:'utf8',timeout:60000,env:{PATH:process.env.PATH,TMPDIR:process.env.TMPDIR,...env,REVIEWS_BACKUP_RECIPIENT:recipient,REVIEWS_B2_PRUNE_KEY_ID:'pruner-fixture',REVIEWS_B2_PRUNE_APPLICATION_KEY:'pruner-secret-fixture'}});
  assert.equal(r.status,0,'CLI must actually bind the separate pruning principal: '+r.stderr);
  const proof=JSON.parse(r.stdout.trim().split('\n').at(-1)!);
  assert.ok(proof.deletes>0);
}));

test('actual closed production server binds pruning without opening mail or local auth', async () => withRecovery(async (directory,recipient) => {
  const module=await bindingModule(), f=fixture(), p=syntheticProvider();
  const binding=module.recoveryBinding({...env,REVIEWS_BACKUP_RECIPIENT:recipient,REVIEWS_B2_PRUNE_KEY_ID:'pruner-fixture',REVIEWS_B2_PRUNE_APPLICATION_KEY:'pruner-secret-fixture'})!;
  let now=Date.UTC(2026,8,1);
  try {
    await backupDatabase(f.db,join(directory,'reviews.sqlite'));
    for(let day=0;day<34;day++) {await module.boundRecoveryCycle(f.db,binding,directory,p.transport as typeof fetch,()=>now)();now+=86400000;}
  } finally {f.db.close();}
  const {createServer}=await import('node:net');
  const allocation=createServer();await new Promise<void>(r=>allocation.listen(0,'127.0.0.1',r));
  const port=(allocation.address() as {port:number}).port;await new Promise<void>(r=>allocation.close(()=>r()));
  const remote=p.files.map(f=>({...f,body:f.body.toString('base64')}));
  const server=new URL('../src/server.ts',import.meta.url).href;
  const code=`import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
    const p=(${syntheticProvider.toString()})();p.files.push(...JSON.parse(readFileSync(0,'utf8')).map(f=>({...f,body:Buffer.from(f.body,'base64')})));
    Date.now=()=>${now};
    globalThis.fetch=async(url,init)=>String(url).includes('.well-known/openid-configuration')?new Response(JSON.stringify({issuer:'https://identity.invalid',authorization_endpoint:'https://identity.invalid/auth',token_endpoint:'https://identity.invalid/token',jwks_uri:'https://identity.invalid/keys',response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256']})):p.transport(url,init);
    const timeout=setTimeout(()=>{console.error('bound server proof missing');process.exit(2)},10000);
    await import(${JSON.stringify(server)});
    const http=await import('node:http');
    const request=(path)=>new Promise((resolve,reject)=>{const req=http.get({hostname:'127.0.0.1',port:${port},path,headers:{host:'reviews.invalid'}},res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);});
    const configResponse=await request('/v1/config');assert.equal(configResponse.status,200);
    const publicConfig=JSON.parse(configResponse.body);assert.equal(publicConfig.local,false);assert.equal(publicConfig.closed,true);
    assert.equal((await request('/__local/login')).status,404);
    const poll=setInterval(()=>{
      try {const state=JSON.parse(readFileSync(${JSON.stringify(join(directory,'offhost-state.json'))},'utf8'));
        if(state.lastVerifiedSync===${now}&&p.deletes.length>0) {clearInterval(poll);clearTimeout(timeout);console.log(JSON.stringify({proof:'closed-server-pruning',deletes:p.deletes.length}));process.kill(process.pid,'SIGTERM');}
      }catch{}
    },20);`;
  const r=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',code],{encoding:'utf8',input:JSON.stringify(remote),timeout:20000,env:{PATH:process.env.PATH,TMPDIR:process.env.TMPDIR,...env,REVIEWS_BACKUP_RECIPIENT:recipient,REVIEWS_B2_PRUNE_KEY_ID:'pruner-fixture',REVIEWS_B2_PRUNE_APPLICATION_KEY:'pruner-secret-fixture',HOST:'127.0.0.1',PORT:String(port),REVIEWS_DATA_DIR:directory,REVIEWS_CLOSED:'true',REVIEWS_SITE_URL:'https://reviews.invalid',REVIEWS_API_URL:'https://reviews.invalid',REVIEWS_KEY:Buffer.alloc(32,7).toString('base64'),OIDC_ISSUER:'https://identity.invalid',OIDC_CLIENT_ID:'browser-fixture',OIDC_CLIENT_SECRET:'fixture-only',OIDC_DISCOVERY_URL:'https://identity.invalid/.well-known/openid-configuration',OIDC_REDIRECT_URI:'https://reviews.invalid/v1/admin/callback',REVIEWS_ADMIN_ORIGIN:'https://reviews.invalid',OIDC_AUDIENCE:'api-fixture',OIDC_JWKS_URL:'https://identity.invalid/keys',OIDC_SUBJECTS:'owner-fixture',OIDC_MFA_METHODS:'otp',TURNSTILE_SECRET:'fixture-only',TURNSTILE_SITEKEY:'fixture-only',TURNSTILE_HOSTNAME:'reviews.invalid',RESEND_API_KEY:'fixture-only',MAIL_FROM:'fixture@reviews.invalid'}});
  assert.equal(r.status,0,'closed production server must complete scoped pruning: '+r.stderr);
  assert.ok(r.stdout.includes('closed-server-pruning'));
  assert.ok(r.stdout.includes('MAIL PAUSED'));
  assert.equal(probeBackup(directory,now).admitted,true);
}));

test('CLI refuses a split database and scheduler/budget directory before any transport or mutation', async () => withRecovery(async (directory,recipient) => {
  const {mkdir,readdir}=await import('node:fs/promises');
  const other=join(directory,'split-state');await mkdir(other);
  const f=fixture(),source=join(directory,'reviews.sqlite');
  try {await backupDatabase(f.db,source);}finally{f.db.close();}
  const before=await readFile(source);
  const cli=new URL('../scripts/operations.ts',import.meta.url).href;
  const code=`let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No transport allowed')};process.argv=[process.execPath,'operations.ts','offhost-cycle',${JSON.stringify(source)},${JSON.stringify(other)}];await import(${JSON.stringify(cli)});console.log(JSON.stringify({calls}));`;
  const r=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',code],{encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH,TMPDIR:process.env.TMPDIR,...env,REVIEWS_BACKUP_RECIPIENT:recipient}});
  assert.equal(r.status,1);
  assert.equal(JSON.parse(r.stdout.trim()).calls,0,'misbinding must fail before consuming quota');
  assert.deepEqual(await readFile(source),before);
  assert.deepEqual(await readdir(other),[],'must not create a parallel generation/budget ledger');
}));
