// Original independent B3 HTTP model, copied without production fixtures.
// All responses are synthetic; SQLite, age and request reservation stay real.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as api from '../../src/offhost.ts';
export function provider(recipient:string,directory?:string,clock=Date.now){
 const config={keyId:"writer-synthetic",applicationKey:"synthetic",bucketId:"synthetic",prefix:"reviews/",recipient};
 const files:any[]=[],requests:any[]=[];let n=0,loseUpload=false,loseDelete=false,outage=false;
 const j=(v:any)=>new Response(JSON.stringify(v));
 const transport=async(input:any,init:any={})=>{
  const url=String(input);requests.push({url,body:typeof init.body==='string'?JSON.parse(init.body):null});if(outage)throw Error('independent outage');
  if(url.endsWith('b2_authorize_account')){const prune=new Headers(init.headers).get('Authorization')==='Basic '+Buffer.from('pruner-synthetic:synthetic').toString('base64');return j({accountId:'synthetic',authorizationToken:prune?'pruner':'writer',apiInfo:{storageApi:{apiUrl:'https://api001.backblazeb2.com',downloadUrl:'https://f001.backblazeb2.com',allowed:{buckets:[{id:'synthetic'}],namePrefix:prune?'reviews/backups/':'reviews/',capabilities:prune?['listFiles','readFiles','deleteFiles']:['listFiles','readFiles','writeFiles','listBuckets','readBucketRetentions']}}}});}
  if(url.endsWith('b2_list_buckets'))return j({buckets:[{bucketId:'synthetic',bucketType:'allPrivate',fileLockConfiguration:{isClientAuthorizedToRead:true,value:{isFileLockEnabled:false}},lifecycleRules:[{fileNamePrefix:'reviews/backups/',daysFromUploadingToHiding:27,daysFromHidingToDeleting:1}]}]});
  if(url.endsWith('b2_get_upload_url'))return j({uploadUrl:'https://pod-001.backblaze.com/b2api/v4/b2_upload_file/synthetic',authorizationToken:'synthetic'});
  if(url.includes('b2_upload_file/')){const h=new Headers(init.headers),body=Buffer.from(init.body);const f={fileId:String(++n),fileName:decodeURIComponent(h.get('X-Bz-File-Name')!),bucketId:'synthetic',contentLength:body.length,contentSha1:createHash('sha1').update(body).digest('hex'),action:'upload',body};files.push(f);if(loseUpload){loseUpload=false;throw Error('accepted upload lost ACK');}const {body:_,...receipt}=f;return j(receipt);}
  if(url.endsWith('b2_list_file_versions')){const b=JSON.parse(init.body);assert.equal(b.maxFileCount,100);const matching=files.filter(f=>f.fileName.startsWith(b.prefix));const start=b.startFileId?matching.findIndex(f=>f.fileId===b.startFileId):0;const page=matching.slice(start,start+100),next=matching[start+100];return j({files:page.map(({body,...f})=>f),nextFileName:next?.fileName??null,nextFileId:next?.fileId??null});}
  if(url.includes('b2_download_file_by_id')){const f=files.find(f=>f.fileId===new URL(url).searchParams.get('fileId'));return f?new Response(f.body):new Response('',{status:404});}
  if(url.endsWith('b2_delete_file_version')){assert.equal(new Headers(init.headers).get('Authorization'),'pruner');const b=JSON.parse(init.body);assert.deepEqual(Object.keys(b).sort(),['fileId','fileName']);const i=files.findIndex(f=>f.fileId===b.fileId&&f.fileName===b.fileName);assert.ok(i>=0);assert.ok(b.fileName.startsWith('reviews/backups/'));files.splice(i,1);if(loseDelete){loseDelete=false;throw Error('accepted delete lost ACK');}return j(b);}
  throw Error('Unexpected independent transport call '+url);
 };
 return {files,requests,transport,config,get calls(){return requests.length;},store:api.b2RecoveryStore(config,transport as any,directory,clock),get outage(){return outage;},set outage(x){outage=x;},loseUpload:()=>loseUpload=true,loseDelete:()=>loseDelete=true};
}
