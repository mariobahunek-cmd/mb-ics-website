import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/fixture.ts';
import {planImport,applyImport} from '../scripts/import-authorized-reviews.ts';
import {publishHistorical} from '../src/admin.ts';
import {createApp} from '../src/index.ts';
// @ts-ignore locked development dependency
import {JSDOM} from 'jsdom';
const actor={sub:'synthetic-owner',role:'moderator' as const};
const url='https://www.linkedin.com/feed/update/urn:li:activity:1234567890/';
const row=(id:string,patch:any={})=>({source:'LinkedIn',source_id:id,source_rating:null,source_scale:null,original_date:'2026-01-01',comment_plaintext:'Synthetic recommendation',display_name:'Synthetic',original_language:'en',permission_proof:'PRIVATE_RIGHTS_REFERENCE',rights_confirmed:true,item_type:'recommendation',received_or_given:'received',source_url:url,source_permalink:url,permalink_kind:'exact',platform_source_id:'PRIVATE_PLATFORM_ID',relationship:'PRIVATE_RELATIONSHIP',...patch});
test('reviewed exact source_url remains usable when an optional source_permalink is absent',async()=>{
 const f=fixture();try{
  const input=[row('source-url-only',{source_permalink:null})],plan=planImport(input);applyImport(f.ctx,input,plan.digest);
  publishHistorical(f.ctx,actor,input[0].source_id,{manual_approval:true,rights_confirmed:true,approved_digest:plan.digest,reason:'synthetic-rights-reviewed'},'synthetic-release');
  const app=createApp(f.ctx,{local:true,origins:[f.ctx.site],authenticate:async()=>null});
  const dto=await (await app(new Request(f.ctx.site+'/v1/historical'))).json();assert.equal(dto.items[0].recommendation_url,url);
 }finally{f.db.close();}
});
test('rights-reviewed safe source provenance survives actual public HTTP DTO to rendered source link without private evidence',async()=>{
 const f=fixture(),dom=new JSDOM('<html></html>');
 try{
  const rows=[row('exact'),row('profile',{source_url:'https://www.linkedin.com/in/synthetic/',source_permalink:null,permalink_kind:'profile'}),row('missing',{source_permalink:null,permalink_kind:'unavailable'}),row('unsafe-host',{source_permalink:'https://evil.invalid/exact'}),row('credentials',{source_permalink:'https://www.linkedin.com/feed/update/urn:li:activity:123/?token=PRIVATE_TOKEN'}),row('mislabelled-profile',{source_permalink:'https://www.linkedin.com/in/synthetic/'}),row('unreviewed')];
  const plan=planImport(rows);applyImport(f.ctx,rows,plan.digest);
  for(const r of rows.filter(r=>r.source_id!=='unreviewed'))publishHistorical(f.ctx,actor,r.source_id,{manual_approval:true,rights_confirmed:true,approved_digest:plan.digest,reason:'synthetic-rights-reviewed'},'synthetic-release');
  // A legacy status bit alone is not proof of a rights-reviewed release.
  f.db.prepare("UPDATE historical SET status='published' WHERE source_id='unreviewed'").run();
  const app=createApp(f.ctx,{local:true,origins:[f.ctx.site],authenticate:async()=>null});
  const response=await app(new Request(f.ctx.site+'/v1/historical'));assert.equal(response.status,200);
  const dto=await response.json(),items=dto.items;assert.equal(items.length,rows.length);
  const m=await import(new URL('../../../trust-reviews.js',import.meta.url).href);
  const exact=items.find((r:any)=>r.recommendation_url===url);assert.ok(exact,'exact URL must cross canonical API boundary');
  const link=m.sourceLink(dom.window.document,exact,'en');assert.equal(link.tagName,'A');assert.equal(link.href,url);assert.match(link.textContent,/Original recommendation/);
  const profile=items.find((r:any)=>r.profile_url);assert.ok(profile);assert.match(m.sourceLink(dom.window.document,profile,'en').textContent,/profile.*not.*exact/i);
  assert.equal(items.filter((r:any)=>r.recommendation_url).length,1);assert.equal(items.filter((r:any)=>r.profile_url).length,1);
  for(const item of items.filter((r:any)=>!r.recommendation_url&&!r.profile_url))assert.equal(m.sourceLink(dom.window.document,item,'en').tagName,'SPAN');
  assert.doesNotMatch(JSON.stringify(dto),/PRIVATE_|permission_proof|provenance_json|approved_digest|canonical_decision|platform_source_id|relationship|source_permalink/);
 }finally{dom.window.close();f.db.close();}
});
