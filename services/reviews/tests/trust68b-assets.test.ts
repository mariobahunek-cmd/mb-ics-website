import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,relative,extname} from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {fixture} from './helpers/fixture.ts';
import {planImport,applyImport} from '../scripts/import-authorized-reviews.ts';
import {withdrawHistorical} from '../src/admin.ts';
import {createApp} from '../src/index.ts';
const root=resolve(import.meta.dirname,'../../..');
const inventory=JSON.parse(readFileSync(resolve(root,'docs/trust68b-archive-inventory.json'),'utf8'));
const site=process.env.TRUST68B_SITE || root;
function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 if(!process.env.TRUST68B_SITE && (e.name.startsWith('_') || e.name.startsWith('.') || ['docs','services','node_modules','tests'].includes(e.name)))return [];
 const p=resolve(dir,e.name);return e.isDirectory()?files(p):[p];
});}
test('SEC68-1 fresh anonymous public assets never transmit any retained archive name or quote, healthy or unavailable registry',async()=>{
 const f=fixture(),first=inventory.records[0];
 const fields=[first.source,first.name,first.initials,...['de','en','es'].map(l=>first.role?.[l]??''),...['de','en','es'].map(l=>first.quote?.[l]??'')];
 const alias='homepage/'+createHash('sha256').update(JSON.stringify(fields)).digest('hex');
 const input=[{source:'ProvenExpert',source_id:'synthetic-asset-alias',source_rating:4,source_scale:5,original_date:'2020-01-01',comment_plaintext:'SYNTHETIC AUTHORITY ONLY',display_name:'SYNTHETIC',original_language:'en',permission_proof:'SYNTHETIC RIGHTS',rights_confirmed:true,canonical_id:'11111111-1111-4111-8111-111111111111',canonical_decision_reference:'SYNTHETIC EXPLICIT MAP',homepage_id:alias}];
 applyImport(f.ctx,input,planImport(input).digest);withdrawHistorical(f.ctx,{sub:'synthetic-owner',role:'moderator'},input[0].source_id);
 const app=createApp(f.ctx,{local:true,origins:[f.ctx.site],authenticate:async()=>null});let outage=false;
 const publicFiles=files(site).filter(p=>['.js','.json','.html','.css','.svg','.txt','.xml','.md','.yml','.yaml','.map'].includes(extname(p)));
 const server=createServer(async(req,res)=>{const path=new URL(req.url!,'http://localhost').pathname;
  if(path.startsWith('/v1/')){if(outage){res.writeHead(503).end();return;}const r=await app(new Request(f.ctx.site+path));res.writeHead(r.status,{'cache-control':'no-store'}).end(await r.text());return;}
  const p=publicFiles.find(p=>'/'+relative(site,p)===path);if(!p){res.writeHead(404).end();return;}res.writeHead(200,{'cache-control':'no-store'}).end(readFileSync(p));
 });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+(server.address() as any).port;
 try{
  const registry=await (await fetch(origin+'/v1/historical/identities')).json();assert.ok(registry.homepage_suppressed.includes(alias));
  const hits:any[]=[];
  for(const failed of [false,true]){outage=failed;for(const p of publicFiles){const r=await fetch(origin+'/'+relative(site,p),{cache:'no-store'});assert.equal(r.status,200);const body=await r.text();
   for(const [i,record] of inventory.records.entries())for(const [kind,value] of [['name',record.name],...Object.entries(record.quote).map(([l,q])=>['quote-'+l,q])]){
    const v=String(value);if(body.includes(v)||body.includes(JSON.stringify(v).slice(1,-1)))hits.push({outage:failed,file:relative(site,p),record:i,kind});
   }
  }}
  console.log(JSON.stringify({syntheticMappingOnly:true,realPersonWithdrawalClaim:false,alias,archiveRecords:inventory.count,files:publicFiles.length,hits}));
  assert.deepEqual(hits,[],'fresh public transmission of retained archive payload');
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));f.db.close();}
});
