import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
// @ts-ignore locked development dependency
import {JSDOM} from 'jsdom';
import {fixture} from './helpers/fixture.ts';
import {planImport,applyImport} from '../scripts/import-authorized-reviews.ts';
import {publishHistorical,withdrawHistorical} from '../src/admin.ts';
import {createApp} from '../src/index.ts';
import {createServer} from 'node:http';
const script=()=>readFileSync(new URL('../../../review-archive.js',import.meta.url),'utf8');
const row=(i=0,source='LinkedIn')=>({id:'synthetic-'+i,source,comment:'Exact original <img src=x>\n  original spacing '+i,display_name:'Synthetic '+i,original_language:'de',original_date:'2026-01-01',source_rating:null,source_scale:null,profile_url:'https://www.linkedin.com/in/synthetic/'});
function load(fetch:any){const window:any={};runInNewContext(script(),{window,fetch,AbortSignal});return window.ReviewArchive;}
function transport(items:any[],requests:any[]=[]){return async(url:string,opts:any)=>{requests.push({url,opts});if(url.endsWith('/identities'))return Response.json({homepage_suppressed:[]});const offset=Number(new URL(url).searchParams.get('offset')||0);return Response.json({items:items.slice(offset,offset+20),count:items.length,next_offset:offset+20<items.length?offset+20:null});};}
async function renderer(fetch:any){
 const dom=new JSDOM('<html data-lang="en"><div id="testimonialsGrid" data-canonical-api="https://reviews.invalid"><div class="testimonial-card">Synthetic stale SSR</div></div><button id="loadMoreBtn"></button><p id="testimonial-registry-status" data-unavailable="Synthetic unavailable"></p></html>',{url:'https://site.invalid',runScripts:'outside-only'});
 const w=dom.window;w.fetch=fetch;w.AbortSignal=AbortSignal;
 w.sourceLink=(await import(new URL('../../../trust-reviews.js',import.meta.url).href)).sourceLink;
 w.eval(script());w.eval(readFileSync(new URL('../../../testimonials.js',import.meta.url),'utf8').replace(/^import .*;\n/m,''));
 await w.initializeTestimonialArchive();return dom;
}
test('unhydrated homepage never publishes archive bodies without current canonical authority',()=>{
 const home=readFileSync(new URL('../../../_includes/home.html',import.meta.url),'utf8');
 const grid=home.slice(home.indexOf('id="testimonialsGrid"'),home.indexOf('id="website-feedback"'));
 assert.doesNotMatch(grid,/card\.quote|card\.name|class="testimonial-card"/);assert.match(home,/review-archive\.js/);assert.match(grid,/data-canonical-api/);assert.match(grid,/<noscript>/);
});
test('canonical public identity deduplication is language/order/rating neutral, with distinct LinkedIn filtering and bounded pagination',async()=>{
 const items=[...Array.from({length:20},(_,i)=>row(i,'ProvenExpert')),...[0,1,5,-3].map((rating,i)=>({...row(i+20),source_rating:rating})),row(20)];
 const requests:any[]=[];const selected=await load(transport(items,requests)).prepare('https://reviews.invalid/');
 assert.equal(selected.length,4);assert.deepEqual(Array.from(selected,(r:any)=>r.id),items.slice(20,24).map(r=>r.id));
 assert.ok(requests.some(r=>r.url.endsWith('offset=20')));for(const r of requests){assert.equal(r.opts.credentials,'omit');assert.equal(r.opts.cache,'no-store');}
 const reversed=await load(transport(items.toReversed())).prepare('https://reviews.invalid');assert.deepEqual(Array.from(reversed,(r:any)=>r.id).sort(),Array.from(selected,(r:any)=>r.id).sort());
});
test('unavailable or malformed canonical registry or feed fails closed without a local archive fallback',async()=>{
 for(const bad of [null,{}, {homepage_suppressed:['human-name']}, {homepage_suppressed:[],items:[]}]){
  await assert.rejects(load(async()=>Response.json(bad)).prepare('https://reviews.invalid'));
 }
 for(const bad of [null,{}, {items:[row()],count:2,next_offset:null},{items:[{...row(),comment:42}],count:1,next_offset:null},{items:[],count:1001,next_offset:20},{items:[],count:20,next_offset:0}]){
  await assert.rejects(load(async(url:string)=>url.endsWith('/identities')?Response.json({homepage_suppressed:[]}):Response.json(bad)).prepare('https://reviews.invalid'));
 }
 for(const fetch of [async()=>{throw Error('offline')},async()=>new Response('',{status:503})])await assert.rejects(load(fetch).prepare('https://reviews.invalid'));
});
test('actual canonical HTTP publication is exact, withdrawal prevents fresh transmission and language/load-more revalidate without stale overwrite',async()=>{
 const f=fixture(),actor={sub:'synthetic-owner',role:'moderator' as const};
 const rows=Array.from({length:9},(_,i)=>({source:'LinkedIn',source_id:'synthetic-'+i,source_rating:null,source_scale:null,original_date:'2026-01-01',comment_plaintext:row(i).comment,display_name:row(i).display_name,original_language:'de',permission_proof:'PRIVATE RIGHTS',rights_confirmed:true,item_type:'recommendation',received_or_given:'received',platform_source_id:'synthetic-platform-'+i,source_url:row().profile_url,permalink_kind:'profile'}));
 const plan=planImport(rows);applyImport(f.ctx,rows,plan.digest);for(const r of rows)publishHistorical(f.ctx,actor,r.source_id,{manual_approval:true,rights_confirmed:true,approved_digest:plan.digest,reason:'synthetic-review'},'synthetic-release');
 const app=createApp(f.ctx,{local:true,origins:[f.ctx.site],authenticate:async()=>null});let offline=false;
 const server=createServer(async(req,res)=>{if(offline){res.writeHead(503).end();return;}const r=await app(new Request(new URL(req.url!,f.ctx.site)));res.writeHead(r.status,Object.fromEntries(r.headers)).end(await r.text());});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+(server.address() as any).port;
 let dom:any;try{
  dom=await renderer((url:string,opts:any)=>fetch(origin+new URL(url).pathname+new URL(url).search,opts));const w=dom.window,d=w.document;
  assert.equal(d.querySelectorAll('.testimonial-card').length,6);assert.equal(d.querySelector('img'),null);assert.equal(d.querySelector('.testimonial-card__quote p').textContent,row().comment);assert.equal(d.querySelector('.testimonial-card__quote p').lang,'de');assert.equal(d.querySelector('.testimonial-card strong').textContent,row().display_name);assert.doesNotMatch(d.getElementById('testimonialsGrid').textContent,/stale SSR|Participant|5 stars|\/ 5/);assert.match(d.querySelector('.testimonial-card a').textContent,/profile.*not.*exact/i);
  withdrawHistorical(f.ctx,actor,rows[0].source_id);const fresh=await (await fetch(origin+'/v1/historical',{cache:'no-store'})).text();assert.ok(!fresh.includes(rows[0].comment_plaintext));
  d.documentElement.setAttribute('data-lang','es');await w.refreshTestimonialLanguage();assert.equal(d.querySelectorAll('.testimonial-card').length,6);assert.ok(!d.getElementById('testimonialsGrid').textContent.includes(rows[0].comment_plaintext));assert.match(d.getElementById('loadMoreBtn').textContent,/2 restantes/);
  await w.loadMoreTestimonials();assert.equal(d.querySelectorAll('.testimonial-card').length,8);assert.equal(d.getElementById('loadMoreBtn').style.display,'none');
  offline=true;await w.refreshTestimonialLanguage();assert.equal(d.querySelectorAll('.testimonial-card').length,0);assert.match(d.getElementById('testimonial-registry-status').textContent,/unavailable/);
 }finally{dom?.window.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));f.db.close();}
});
test('zero and one canonical recommendation have honest states; late language request cannot republish after outage',async()=>{
 let items:any[]=[],offline=false,hold:any=null,slow=false;const fetch=async(url:string,opts:any)=>{
  if(slow&&!url.endsWith('/identities')){slow=false;const response=await transport(items)(url,opts);await new Promise(r=>hold=r);return response;}
  if(offline)throw Error('offline');return transport(items)(url,opts);
 };
 const dom=await renderer(fetch);try{const w=dom.window,d=w.document;assert.equal(d.querySelectorAll('.testimonial-card').length,0);assert.match(d.getElementById('testimonial-registry-status').textContent,/No.*recommendations/i);
  items=[row()];await w.refreshTestimonialLanguage();assert.equal(d.querySelectorAll('.testimonial-card').length,1);
  slow=true;const late=w.refreshTestimonialLanguage();await new Promise(r=>setTimeout(r,0));offline=true;await w.refreshTestimonialLanguage();hold();await late;assert.equal(d.querySelectorAll('.testimonial-card').length,0);
 }finally{dom.window.close();}
});
