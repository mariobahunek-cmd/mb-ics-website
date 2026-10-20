// Stable-endpoint upload only. Native API still validates policy, version metadata
// and exact ciphertext readback. AWS-maintained SigV4 signs, never transports.
import {SignatureV4} from '@smithy/signature-v4';
import {HttpRequest} from '@smithy/protocol-http';
import {Sha256} from '@aws-crypto/sha256-js';
export function s3Endpoint(raw:string) {
 const u=new URL(raw);
 const match=u.hostname.match(/^s3\.(eu-central-003)\.backblazeb2\.com$/);
 if(!match||u.protocol!=='https:'||u.port||u.username||u.password||u.hash||u.search||u.pathname!=='/')throw Error('Unsafe S3 recovery endpoint');
 return {origin:u.origin,region:match[1],hostname:u.hostname};
}
export async function signedS3Upload(endpoint:string,bucket:string,fileName:string,body:Buffer,keyId:string,applicationKey:string) {
 const target=s3Endpoint(endpoint);
 if(typeof bucket!=='string'||!/^[a-z0-9][a-z0-9-]{4,61}[a-z0-9]$/.test(bucket)||typeof fileName!=='string'||!fileName||fileName.split('/').some(x=>!x||x==='.'||x==='..')||!/^[A-Za-z0-9_./-]+$/.test(fileName))throw Error('Invalid S3 recovery path');
 const path='/'+bucket+'/'+fileName;
 const signer=new SignatureV4({service:'s3',region:target.region,credentials:{accessKeyId:keyId,secretAccessKey:applicationKey},sha256:Sha256,uriEscapePath:false});
 const request=await signer.sign(new HttpRequest({protocol:'https:',hostname:target.hostname,method:'PUT',path,headers:{host:target.hostname,'content-type':'application/octet-stream','content-length':String(body.length)},body}));
 return {url:target.origin+path,headers:request.headers};
}
