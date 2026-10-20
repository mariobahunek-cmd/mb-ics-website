import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createServer} from 'node:http';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
// @ts-ignore Locked test-only DOM dependency.
import {JSDOM} from 'jsdom';
import {fixture} from './helpers/fixture.ts';
import {planImport,applyImport} from '../scripts/import-authorized-reviews.ts';
import {createApp} from '../src/index.ts';
import {historicalList} from '../src/public.ts';
import {backupDatabase,restoreDatabase,localRecoveryJournal,syncRecovery,recoveryHead,reconcileRecovery} from '../src/operations.ts';
import {openDB} from '../src/db.ts';
const actor={sub:'synthetic-owner',role:'moderator' as const};
const row=(id:string,stars=1,patch:any={})=>({source:'ProvenExpert',source_id:id,source_rating:stars,source_scale:5,original_date:'2020-01-01',comment_plaintext:'Synthetic <img src=x onerror=alert(1)> body',display_name:'Synthetic Name',original_language:'en',permission_proof:'synthetic-rights-proof',rights_confirmed:true,source_url:'https://source.invalid/synthetic',...patch});
async function settle(fn:()=>boolean){for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}assert.ok(fn(),'synthetic DOM did not settle');}
test('normal historical moderation UI -> real loopback app: original context, explicit rights, Publish and neutral Reject for all ratings1-5',async()=>{
 const {ctx,db}=fixture();let dom:any;
 const records=Array.from({length:5},(_,i)=>[row('synthetic-publish-'+(i+1),i+1),row('synthetic-reject-'+(i+1),i+1)]).flat();
 const plan=planImport(records);applyImport(ctx,records,plan.digest);
 const app=createApp(ctx,{origins:[ctx.site],authenticate:async req=>req.headers.get('authorization')==='Bearer synthetic-only'?actor:null,historicalReleaseReference:'synthetic-privacy-source-release'});
 const server=createServer(async(req,res)=>{
  if(req.url==='/v1/admin/session'){res.setHeader('content-type','application/json');res.end(JSON.stringify({csrf:'synthetic-csrf'}));return;}
  let body='';for await(const b of req)body+=b;
  const result=await app(new Request(ctx.site+req.url,{method:req.method,headers:req.headers as Record<string,string>,...(req.method==='POST'?{body}: {})}));
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());
 });await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+(server.address() as any).port;
 try {
  assert.equal((await fetch(base+'/v1/admin/historical')).status,401);
  const authed=await fetch(base+'/v1/admin/historical',{headers:{authorization:'Bearer synthetic-only'}});const original:any[]=await authed.json();
  assert.equal(original[0].comment_plaintext,records[0].comment_plaintext);assert.equal(original[0].display_name,'Synthetic Name');
  assert.equal(original[0].permission_proof,'synthetic-rights-proof');assert.equal(original[0].approved_digest,plan.digest);assert.equal(original[0].import_rights_confirmed,true);assert.ok(original[0].provenance.source_url);
  assert.ok(!JSON.stringify(historicalList(ctx,new URLSearchParams())).includes('synthetic-rights-proof'));
  dom=new JSDOM(readFileSync(new URL('../admin/index.html',import.meta.url),'utf8'),{url:ctx.site,runScripts:'outside-only'});dom.window.confirm=()=>true;
  const calls:any[]=[];dom.window.fetch=async(path:string,opts:any={})=>{calls.push({path,body:opts.body});return fetch(base+path,{...opts,headers:{...opts.headers,authorization:'Bearer synthetic-only',...(opts.method==='POST'?{origin:ctx.site}:{})}});};
  dom.window.eval(readFileSync(new URL('../admin/admin.js',import.meta.url),'utf8'));
  await settle(()=>dom.window.document.querySelectorAll('.historical-card').length===10);
  assert.ok(calls.some(c=>c.path.startsWith('/v1/admin/historical')));
  assert.equal(dom.window.document.querySelector('.historical-card img'),null,'body must render as text, not HTML');
  for(let stars=1;stars<=5;stars++){
   const find=(id:string)=>Array.from(dom.window.document.querySelectorAll('.historical-card')).find((c:any)=>c.dataset.sourceId===id) as any;
   let card=find('synthetic-publish-'+stars);assert.ok(card);
   card.querySelector('[data-action="publish"]').click();await new Promise(r=>setTimeout(r,10));assert.equal(db.prepare('SELECT status FROM historical WHERE source_id=?').get('synthetic-publish-'+stars)!.status,'pending_moderation');
   card.querySelector('[data-rights-confirmed]').checked=true;card.querySelector('[data-action="publish"]').click();
   await settle(()=>db.prepare('SELECT status FROM historical WHERE source_id=?').get('synthetic-publish-'+stars)!.status==='published');
   await settle(()=>find('synthetic-publish-'+stars)?.dataset.status==='published');
   card=find('synthetic-reject-'+stars);card.querySelector('select').value='sensitive_personal_data';card.querySelector('[data-action="reject"]').click();
   await settle(()=>db.prepare('SELECT status FROM historical WHERE source_id=?').get('synthetic-reject-'+stars)!.status==='withdrawn');
   await settle(()=>find('synthetic-reject-'+stars)?.dataset.status==='rejected');
   const erased=db.prepare('SELECT * FROM historical WHERE source_id=?').get('synthetic-reject-'+stars)!;assert.equal(erased.comment_plaintext,'');assert.equal(erased.display_name,'');
   assert.equal(db.prepare('SELECT count(*) n FROM historical_provenance WHERE source_id=?').get('synthetic-reject-'+stars)!.n,0);
  }
  assert.equal(historicalList(ctx,new URLSearchParams()).count,5);
  assert.equal(calls.filter(c=>c.path.endsWith('/approve')&&c.body).length,5);
  assert.equal(calls.filter(c=>c.path.endsWith('/reject')&&c.body).length,5);
  assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE action='historical_rejected'").get()!.n,5);
 }finally{dom?.window.close();await new Promise<void>(resolve=>server.close(()=>resolve()));db.close();}
});
test('historical rejection validates methods/reasons/manual action and journals group erasure through old-backup restore',async()=>{
 const {ctx,db}=fixture(),dir=mkdtempSync(join(tmpdir(),'synthetic-reject-')),journal=localRecoveryJournal(join(dir,'journal.sqlite'));
 try {
  const common={canonical_id:'11111111-1111-4111-8111-111111111111',canonical_decision_reference:'synthetic-reviewed-group',homepage_id:'homepage/'+'a'.repeat(64)};
  const records=[row('synthetic-group-a',1,common),row('synthetic-group-b',5,common)];applyImport(ctx,records,planImport(records).digest);
  const archive=join(dir,'before.sqlite'),dest=join(dir,'restore.sqlite');await backupDatabase(db,archive);
  const app=createApp(ctx,{origins:[ctx.site],authenticate:async()=>actor});
  const req=(body:any)=>new Request(ctx.site+'/v1/admin/historical/synthetic-group-a/reject',{method:'POST',headers:{origin:ctx.site,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await app(req({manual_rejection:false,reason:'spam'}))).status,403);
  assert.equal((await app(req({manual_rejection:true,reason:'low_stars'}))).status,400);
  assert.equal((await app(req({manual_rejection:true,reason:'spam'}))).status,200);
  assert.equal(db.prepare("SELECT count(*) n FROM historical WHERE status='withdrawn' AND comment_plaintext=''").get()!.n,2);
  assert.equal(db.prepare("SELECT count(*) n FROM historical_moderation WHERE decision='rejected'").get()!.n,2);
  await syncRecovery(db,journal);await restoreDatabase(archive,dest);await reconcileRecovery(dest,journal,recoveryHead(db),ctx.now());
  const restored=openDB(dest);try{assert.equal(restored.prepare("SELECT count(*) n FROM historical WHERE status='withdrawn' AND comment_plaintext='' AND display_name=''").get()!.n,2);assert.equal(restored.prepare('SELECT count(*) n FROM historical_provenance').get()!.n,0);
  const renamed=[row('synthetic-renamed',3,common)];assert.throws(()=>applyImport({...ctx,db:restored},renamed,planImport(renamed).digest),/tombstone/);}finally{restored.close();}
 }finally{journal.close();db.close();rmSync(dir,{recursive:true,force:true});}
});
