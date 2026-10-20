import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,createHmac} from 'node:crypto';
import {b2RecoveryStore,recoveryConfig} from '../src/offhost.ts';
import {s3Endpoint,signedS3Upload} from '../src/s3-upload.ts';
let dir:string,recipient:string;
before(async()=>{dir=await mkdtemp(join(tmpdir(),'s3-negative-'));const key=join(dir,'key');assert.equal(spawnSync('age-keygen',['-o',key]).status,0);recipient=spawnSync('age-keygen',['-y',key],{encoding:'utf8'}).stdout.trim();});
after(async()=>{await rm(dir,{recursive:true,force:true});});
const sha=(b:Buffer|string)=>createHash('sha1').update(b).digest('hex');
const json=(v:unknown)=>new Response(JSON.stringify(v));
function fixture(change:(stage:string,v:any)=>any=(s,v)=>v){
 let encrypted=Buffer.alloc(0);const calls:string[]=[];
 const config={keyId:'synthetic-writer',applicationKey:'synthetic-secret',bucketId:'bucket-id',prefix:'reviews/',recipient,uploadTransport:'s3' as const};
 const fetcher=async(input:any,init:any={})=>{
  const u=new URL(String(input));const stage=u.hostname==='s3.eu-central-003.backblazeb2.com'?'upload':u.pathname.split('/').at(-1)!;calls.push(stage);
  assert.equal(init.redirect,'error');assert.ok(init.signal instanceof AbortSignal);
  if(stage==='b2_authorize_account')return json(change(stage,{accountId:'account',authorizationToken:'synthetic-auth',apiInfo:{storageApi:{apiUrl:'https://api003.backblazeb2.com',downloadUrl:'https://f003.backblazeb2.com',s3ApiUrl:'https://s3.eu-central-003.backblazeb2.com',allowed:{buckets:[{id:'bucket-id'}],namePrefix:'reviews/',capabilities:['listFiles','readFiles','writeFiles','listBuckets','readBucketRetentions']}}}}));
  if(stage==='b2_list_buckets')return json(change(stage,{buckets:[{bucketId:'bucket-id',bucketName:'synthetic-reviews',bucketType:'allPrivate',fileLockConfiguration:{isClientAuthorizedToRead:true,value:{isFileLockEnabled:false}},lifecycleRules:[{fileNamePrefix:'reviews/backups/',daysFromUploadingToHiding:27,daysFromHidingToDeleting:1}]}]}));
  if(stage==='upload'){
   encrypted=Buffer.from(init.body);assert.equal(init.method,'PUT');assert.equal(u.pathname,'/synthetic-reviews/reviews/backups/test.enc');
   return change(stage,new Response(null,{status:200,headers:{'x-amz-version-id':'version-id'}}));
  }
  if(stage==='b2_get_file_info'){assert.deepEqual(JSON.parse(init.body),{fileId:'version-id'});return json(change(stage,{fileId:'version-id',fileName:'reviews/backups/test.enc',bucketId:'bucket-id',contentLength:encrypted.length,contentSha1:sha(encrypted)}));}
  if(stage==='b2_download_file_by_id')return change(stage,new Response(encrypted));
  throw Error('Unexpected operation '+stage);
 };
 return {calls,config,store:()=>b2RecoveryStore(config,fetcher as typeof fetch),put:()=>b2RecoveryStore(config,fetcher as typeof fetch).put('backups/test.enc',Buffer.from('synthetic private data'))};
}
for(const endpoint of ['http://s3.eu-central-003.backblazeb2.com','https://s3.us-west-004.backblazeb2.com','https://s3.eu-central-003.backblazeb2.com.evil.test','https://user:pass@s3.eu-central-003.backblazeb2.com','https://s3.eu-central-003.backblazeb2.com:8443','https://s3.eu-central-003.backblazeb2.com/path','https://s3.eu-central-003.backblazeb2.com/?query=1','https://s3.eu-central-003.backblazeb2.com/#fragment','https://127.0.0.1', 'invalid'])test('rejects unsafe endpoint '+endpoint,()=>assert.throws(()=>s3Endpoint(endpoint)));
for(const bucket of ['','../evil','short','UPPER-case','has.dot','-synthetic','synthetic-','a'.repeat(64)])test('signer rejects bucket '+bucket,async()=>{await assert.rejects(signedS3Upload('https://s3.eu-central-003.backblazeb2.com',bucket,'reviews/backups/test.enc',Buffer.from('ciphertext'),'synthetic','synthetic'));});
for(const path of ['', '../escape','reviews/../escape','reviews//bad','/reviews/file','reviews/file?x','reviews/%2e%2e/x','reviews/file#x','reviews/ü'])test('signer rejects path '+path,async()=>{await assert.rejects(signedS3Upload('https://s3.eu-central-003.backblazeb2.com','synthetic-reviews',path,Buffer.from('ciphertext'),'synthetic','synthetic'));});
test('independent HMAC calculation verifies signed ciphertext hash and canonical path',async()=>{
 const body=Buffer.from('synthetic ciphertext');const signed=await signedS3Upload('https://s3.eu-central-003.backblazeb2.com','synthetic-reviews','reviews/backups/test.enc',body,'synthetic-writer','synthetic-secret');
 const h=new Headers(signed.headers),auth=h.get('authorization')!;const m=auth.match(/^AWS4-HMAC-SHA256 Credential=synthetic-writer\/([^,]+), SignedHeaders=([^,]+), Signature=([a-f0-9]{64})$/)!;assert.ok(m);
 const H=(v:string)=>createHash('sha256').update(v).digest('hex');const mac=(key:Buffer|string,v:string)=>createHmac('sha256',key).update(v).digest();
 assert.equal(h.get('x-amz-content-sha256'),H(body.toString()));
 const canonical=['PUT','/synthetic-reviews/reviews/backups/test.enc','',m[2].split(';').map(k=>k+':'+h.get(k)+'\n').join(''),m[2],H(body.toString())].join('\n');
 const [date,region,service,terminal]=m[1].split('/');assert.equal(region,'eu-central-003');assert.equal(service,'s3');assert.equal(terminal,'aws4_request');
 const key=mac(mac(mac(mac('AWS4synthetic-secret',date),region),service),terminal);
 assert.equal(mac(key,['AWS4-HMAC-SHA256',h.get('x-amz-date'),m[1],H(canonical)].join('\n')).toString('hex'),m[3]);
});
for(const [name,mutate] of Object.entries({missing:(v:any)=>{delete v.apiInfo.storageApi.s3ApiUrl;},wrongRegion:(v:any)=>{v.apiInfo.storageApi.s3ApiUrl='https://s3.us-west-004.backblazeb2.com';},wrongBucket:(v:any)=>{v.apiInfo.storageApi.allowed.buckets=[{id:'other'}];},wrongPrefix:(v:any)=>{v.apiInfo.storageApi.allowed.namePrefix='reviews/backups/';},extraRights:(v:any)=>{v.apiInfo.storageApi.allowed.capabilities.push('deleteFiles');}}))test('auth fails closed before upload '+name,async()=>{const f=fixture((s,v)=>{if(s==='b2_authorize_account')mutate(v);return v;});await assert.rejects(f.put());assert.deepEqual(f.calls,['b2_authorize_account']);});
for(const [name,mutate] of Object.entries({public:(v:any)=>{v.buckets[0].bucketType='allPublic';},unsafeBucket:(v:any)=>{v.buckets[0].bucketName='../escape';},missingBucket:(v:any)=>{delete v.buckets[0].bucketName;},shortRetention:(v:any)=>{v.buckets[0].lifecycleRules[0].daysFromUploadingToHiding=1;}}))test('bucket policy fails closed '+name,async()=>{const f=fixture((s,v)=>{if(s==='b2_list_buckets')mutate(v);return v;});await assert.rejects(f.put());assert.equal(f.calls.includes('upload'),false);});
for(const status of [201,204,301,307,400,403,429,500])test('rejects non-200 S3 status '+status,async()=>{const f=fixture((s,v)=>s==='upload'?new Response(null,{status,headers:{'x-amz-version-id':'version-id'}}):v);await assert.rejects(f.put());assert.equal(f.calls.filter(s=>s==='upload').length,1);assert.equal(f.calls.includes('b2_get_file_info'),false);});
for(const version of [null,'','bad version','x'.repeat(2049)])test('rejects invalid S3 version '+String(version).slice(0,25),async()=>{const f=fixture((s,v)=>s==='upload'?new Response(null,{headers:version===null?{}:{'x-amz-version-id':version}}):v);await assert.rejects(f.put());assert.equal(f.calls.includes('b2_get_file_info'),false);});
for(const [name,mutate] of Object.entries({id:(v:any)=>{v.fileId='other';},bucket:(v:any)=>{v.bucketId='other';},prefix:(v:any)=>{v.fileName='outside/test.enc';},name:(v:any)=>{v.fileName='reviews/backups/other.enc';},length:(v:any)=>{v.contentLength++;},sha1:(v:any)=>{v.contentSha1='0'.repeat(40);},malformedHash:(v:any)=>{v.contentSha1='none';}}))test('rejects native info mismatch '+name,async()=>{const f=fixture((s,v)=>{if(s==='b2_get_file_info')mutate(v);return v;});await assert.rejects(f.put());assert.equal(f.calls.includes('b2_download_file_by_id'),false);});
test('rejects corrupted exact-version download',async()=>{const f=fixture((s,v)=>s==='b2_download_file_by_id'?new Response(Buffer.from('corrupt')):v);await assert.rejects(f.put());});
test('transport timeout fails once without retry or fallback',async()=>{const f=fixture((s,v)=>{if(s==='upload')throw new DOMException('synthetic timeout','TimeoutError');return v;});await assert.rejects(f.put(),{name:'TimeoutError'});assert.equal(f.calls.filter(s=>s==='upload').length,1);assert.equal(f.calls.includes('b2_get_upload_url'),false);});
test('rejects unknown upload transport before network',()=>{const f=fixture();assert.throws(()=>b2RecoveryStore({...f.config,uploadTransport:'unknown'} as any));});
test('rejects path escape before network',async()=>{const f=fixture();await assert.rejects(f.store().put('../outside',Buffer.from('private')));assert.equal(f.calls.length,0);});
test('environment binding validates explicit S3 opt-in',()=>{const f=fixture();const c=recoveryConfig({REVIEWS_RECOVERY_PROVIDER:'b2',REVIEWS_B2_KEY_ID:f.config.keyId,REVIEWS_B2_APPLICATION_KEY:f.config.applicationKey,REVIEWS_B2_BUCKET_ID:f.config.bucketId,REVIEWS_B2_PREFIX:'reviews/',REVIEWS_BACKUP_RECIPIENT:recipient,REVIEWS_B2_UPLOAD_TRANSPORT:'s3'});assert.equal(c?.uploadTransport,'s3');});
