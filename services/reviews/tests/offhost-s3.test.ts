import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {b2RecoveryStore} from '../src/offhost.ts';

// Explicit SYNTHETIC protocol-boundary test. Not a real-provider acceptance.
for(const tagged of [false,true])test('S3 opt-in writes encrypted backup through authenticated stable EU endpoint, tagged='+tagged,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'reviews-s3-test-'));
 try{
  const identity=join(dir,'identity');assert.equal(spawnSync('age-keygen',['-o',identity]).status,0);
  const recipient=spawnSync('age-keygen',['-y',identity],{encoding:'utf8'}).stdout.trim();
  let encrypted=Buffer.alloc(0);const calls:string[]=[];
  const value=(v:unknown)=>new Response(JSON.stringify(v));
  const fetcher=async(input:any,init:any={})=>{
   const u=new URL(String(input));calls.push(u.hostname+u.pathname);
   if(u.pathname.endsWith('b2_authorize_account'))return value({accountId:'synthetic-account',authorizationToken:'synthetic-auth',apiInfo:{storageApi:{apiUrl:'https://api003.backblazeb2.com',downloadUrl:'https://f003.backblazeb2.com',s3ApiUrl:'https://s3.eu-central-003.backblazeb2.com',allowed:{buckets:[{id:'synthetic-bucket'}],namePrefix:'reviews/',capabilities:['listFiles','readFiles','writeFiles','listBuckets','readBucketRetentions']}}}});
   if(u.pathname.endsWith('b2_list_buckets'))return value({buckets:[{bucketId:'synthetic-bucket',bucketName:'synthetic-reviews',bucketType:'allPrivate',fileLockConfiguration:{isClientAuthorizedToRead:true,value:{isFileLockEnabled:false}},lifecycleRules:[{fileNamePrefix:'reviews/backups/',daysFromUploadingToHiding:27,daysFromHidingToDeleting:1}]}]});
   if(u.hostname==='s3.eu-central-003.backblazeb2.com'){
    assert.equal(init.method,'PUT');assert.equal(u.pathname,'/synthetic-reviews/reviews/backups/synthetic.enc');
    const h=new Headers(init.headers);assert.match(h.get('authorization')??'',/^AWS4-HMAC-SHA256 Credential=synthetic-writer\//);
    assert.equal(init.redirect,'error');assert.ok(init.signal);encrypted=Buffer.from(init.body);
    assert.ok(encrypted.subarray(0,22).toString().startsWith('age-encryption.org/v1\n'));
    assert.equal(encrypted.includes(Buffer.from('synthetic private database')),false);
    return new Response(null,{status:200,headers:{'x-amz-version-id':'synthetic-version-1'}});
   }
   if(u.pathname.endsWith('b2_get_file_info')){
    assert.deepEqual(JSON.parse(init.body),{fileId:'synthetic-version-1'});
    return value({fileId:'synthetic-version-1',fileName:'reviews/backups/synthetic.enc',bucketId:'synthetic-bucket',contentLength:encrypted.length,contentSha1:(tagged?'unverified:':'')+createHash('sha1').update(encrypted).digest('hex')});
   }
   if(u.pathname.endsWith('b2_download_file_by_id'))return new Response(encrypted);
   throw Error('Unexpected operation: dynamic pod/get_upload_url must not be used in S3 opt-in');
  };
  const store=b2RecoveryStore({keyId:'synthetic-writer',applicationKey:'synthetic-secret',bucketId:'synthetic-bucket',prefix:'reviews/',recipient,uploadTransport:'s3'} as any,fetcher as typeof fetch);
  const receipt=await store.put('backups/synthetic.enc',Buffer.from('synthetic private database'));
  assert.equal(receipt.fileId,'synthetic-version-1');assert.equal(calls.some(x=>x.includes('pod-')||x.includes('b2_get_upload_url')),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
