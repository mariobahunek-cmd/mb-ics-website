import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {b2RecoveryStore} from '../src/offhost.ts';
const ciphertext=Buffer.from('age-encryption.org/v1\n'+'synthetic ciphertext'.repeat(4));
const digest=createHash('sha1').update(ciphertext).digest('hex');
function fixture(metadata:unknown='unverified:'+digest){
 const calls:string[]=[];
 const object={fileId:'accepted-version',fileName:'reviews/backups/accepted.enc',bucketId:'bucket',contentLength:ciphertext.length,contentSha1:metadata,action:'upload'};
 const config={keyId:'synthetic',applicationKey:'synthetic',bucketId:'bucket',prefix:'reviews/',recipient:'age1'+'a'.repeat(58)};
 const fetcher=async(input:any,init:any={})=>{
  const u=new URL(String(input)), op=u.pathname.split('/').at(-1)!;calls.push(op);
  if(op==='b2_authorize_account')return Response.json({accountId:'account',authorizationToken:'synthetic',apiInfo:{storageApi:{apiUrl:'https://api003.backblazeb2.com',downloadUrl:'https://f003.backblazeb2.com',allowed:{buckets:[{id:'bucket'}],namePrefix:'reviews/',capabilities:['listFiles','readFiles','writeFiles','listBuckets','readBucketRetentions']}}}});
  if(op==='b2_list_file_versions')return Response.json({files:[object],nextFileName:null,nextFileId:null});
  if(op==='b2_download_file_by_id'){assert.equal(u.searchParams.get('fileId'),object.fileId);return new Response(ciphertext);}
  throw Error('Unexpected operation '+op);
 };
 return {store:b2RecoveryStore(config,fetcher as typeof fetch),object,calls};
}
for(const value of [digest,'unverified:'+digest])test('native/tagged legacy digest '+value.slice(0,12),async()=>{
 const f=fixture(value);assert.equal((await f.store.inventory())[0].contentSha1,digest);
 assert.equal((await f.store.versions('backups/accepted.enc'))[0].contentSha1,digest);
 assert.deepEqual(await f.store.get(f.object as any),ciphertext);
});
for(const value of [null,undefined,0,{},[],[digest],'none','unverified:none','unverified:','verified:'+digest,'UNVERIFIED:'+digest,digest.toUpperCase(),'unverified:'+digest.toUpperCase(),'unverified:unverified:'+digest,'unverified:'+digest+'\n',digest+'\n',' '+digest,digest+' ',digest.slice(1),'unverified:'+digest+'0','g'.repeat(40)])test('reject malformed SHA1 '+JSON.stringify(value),async()=>{
 const f=fixture(value);f.object.contentSha1=value;
 await assert.rejects(f.store.inventory());await assert.rejects(f.store.versions('backups/accepted.enc'));
 await assert.rejects(f.store.get(f.object as any));assert.equal(f.calls.includes('b2_download_file_by_id'),false);
});
for(const value of ['0'.repeat(40),'unverified:'+'0'.repeat(40)])test('tag is not byte integrity proof '+value.slice(0,12),async()=>{
 const f=fixture(value);const [r]=await f.store.inventory();await assert.rejects(f.store.get(r),/integrity/);
});
test('tagged exact-version receipt normalizes for versions and GET',async()=>{
 const f=fixture();const versions=await f.store.versions('backups/accepted.enc');
 assert.equal(versions[0].contentSha1,digest);
 assert.deepEqual(await f.store.get(f.object as any),ciphertext);
});
test('documented tagged inventory normalizes only metadata; full ciphertext GET still required',async()=>{
 const f=fixture();const objects=await f.store.inventory();
 assert.equal(objects.length,1);assert.equal(objects[0].contentSha1,digest);
 assert.equal(f.calls.includes('b2_download_file_by_id'),false);
 assert.deepEqual(await f.store.get(objects[0]),ciphertext);
 assert.equal(f.calls.filter(x=>x==='b2_download_file_by_id').length,1);
});
