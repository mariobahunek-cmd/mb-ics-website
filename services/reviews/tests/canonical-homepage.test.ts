import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { runInNewContext } from "node:vm";
// @ts-ignore Locked development-only DOM dependency.
import { JSDOM } from "jsdom";
import { fixture } from "./helpers/fixture.ts";
import { planImport, applyImport } from "../scripts/import-authorized-reviews.ts";
import { createApp } from "../src/index.ts";
import { createServer } from "node:http";
const script=()=>readFileSync(new URL("../../../review-archive.js",import.meta.url),"utf8");
const card={name:"Synthetic",initials:"SY",source:"ProvenExpert",role:{de:"Synthetic",en:"Synthetic",es:"Synthetic"},quote:{de:"Synthetic original",en:"Synthetic translation",es:"Synthetic translation ES"}};
function load(fetch:any) {
  const window:any={};runInNewContext(script(),{window,crypto:webcrypto,TextEncoder,fetch,AbortSignal});return window.ReviewArchive;
}
test("unhydrated homepage never publishes archive bodies without current canonical authority",()=>{
  const home=readFileSync(new URL("../../../_includes/home.html",import.meta.url),"utf8");
  const grid=home.slice(home.indexOf('id="testimonialsGrid"'),home.indexOf('id="website-feedback"'));
  assert.doesNotMatch(grid,/card\.quote|card\.name|class="testimonial-card"/);
  assert.match(home,/review-archive\.js/);
  assert.match(grid,/data-canonical-api/);
  assert.match(grid,/<noscript>/);
});
test("same archive experience identity is independent of active language and array position",async()=>{
  const archive=load(()=>{}),a=await archive.identity(card);
  assert.match(a,/^homepage\/[a-f0-9]{64}$/);
  assert.equal(await archive.identity({...card}),a);
  assert.notEqual(await archive.identity({...card,name:"Synthetic unrelated"}),a);
});
test("homepage explicit alias suppression preserves unlinked entries and dedupes only exact archive identities",async()=>{
  const identity=await load(()=>{}).identity(card);
  let request:any;
  const archive=load(async(url:any,opts:any)=>{request={url,opts};return {ok:true,json:async()=>({homepage_suppressed:[identity]})};});
  const other={...card,name:"Synthetic other"};
  const filtered=await archive.prepare([card,other,other],"https://reviews.invalid/");
  assert.equal(filtered.length,1);assert.equal(filtered[0].name,other.name);
  assert.equal(request.url,"https://reviews.invalid/v1/historical/identities");
  assert.equal(request.opts.credentials,"omit");assert.equal(request.opts.cache,"no-store");
});
test("unavailable or malformed canonical registry fails closed, never falls back to withdrawn archive",async()=>{
  for(const fetch of [async()=>{throw new Error("synthetic-offline")},async()=>({ok:false}),async()=>({ok:true,json:async()=>({homepage_suppressed:["human-name"]})})])
    await assert.rejects(load(fetch).prepare([card],"https://reviews.invalid"));
});
test("archive actions revalidate canonical authority and an outage clears previously visible cards",async()=>{
  const dom=new JSDOM('<html data-lang="en"><div id="testimonialsGrid" data-canonical-api="https://reviews.invalid"></div><button id="loadMoreBtn"></button><p id="testimonial-registry-status" data-unavailable="Synthetic unavailable"></p></html>',{url:'https://site.invalid',runScripts:'outside-only'});
  const w=dom.window;let suppressed:string[]=[],offline=false;
  try{
    Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;w.AbortSignal=AbortSignal;w.matchMedia=()=>({matches:true});
    w.fetch=async()=>{if(offline)throw Error('synthetic-offline');return Response.json({homepage_suppressed:suppressed});};
    w.eval(script());const source=readFileSync(new URL('../../../testimonials.js',import.meta.url),'utf8');
    const all=[card,...Array.from({length:8},(_,i)=>({...card,name:'Synthetic unlinked '+i}))];
    w.eval('const testimonialData='+JSON.stringify(all)+';\n'+source.slice(source.indexOf('const BATCH_SIZE')));
    for(let i=0;i<100&&w.document.querySelectorAll('.testimonial-card').length!==6;i++)await new Promise(r=>setTimeout(r,5));
    assert.equal(w.document.querySelectorAll('.testimonial-card').length,6);
    suppressed=[await w.ReviewArchive.identity(card)];
    w.document.documentElement.setAttribute('data-lang','es');await w.refreshTestimonialLanguage();
    assert.ok(!Array.from(w.document.querySelectorAll('.testimonial-card strong')).some((n:any)=>n.textContent==='Synthetic'));
    offline=true;await w.loadMoreTestimonials();
    assert.equal(w.document.querySelectorAll('.testimonial-card').length,0);
    assert.equal(w.document.getElementById('loadMoreBtn').style.display,'none');
    assert.match(w.document.getElementById('testimonial-registry-status').textContent,/unavailable/);
  }finally{dom.window.close();}
});
test("actual homepage renderer suppresses SSR/translated variants and counts only surviving cards on language refresh",async()=>{
  const all=[card,...Array.from({length:8},(_,i)=>({...card,name:"Synthetic remaining "+i}))];
  const blocked=await load(()=>{}).identity(card);
  const {ctx,db}=fixture();
  const input=[{source:"ProvenExpert",source_id:"synthetic-home-integration",source_rating:4.8,source_scale:5,original_date:"2020-01-01",comment_plaintext:"Synthetic",display_name:"Synthetic",original_language:"de",permission_proof:"synthetic-rights",rights_confirmed:true,canonical_id:"11111111-1111-4111-8111-111111111111",canonical_decision_reference:"synthetic-explicit-decision",homepage_id:blocked}];
  applyImport(ctx,input,planImport(input).digest);
  const app=createApp(ctx,{local:true,origins:[ctx.site],authenticate:async()=>null});
  const server=createServer(async(req,res)=>{
    const result=await app(new Request(new URL(req.url!,ctx.site)));
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=(server.address() as {port:number}).port;
  const dom=new JSDOM('<html data-lang="de"><div id="testimonialsGrid" data-canonical-api="https://reviews.invalid"><div class="testimonial-card">Synthetic stale SSR</div></div><button id="loadMoreBtn"></button><p id="testimonial-registry-status" data-unavailable="Synthetic unavailable"></p></html>',{url:"https://site.invalid",runScripts:"outside-only"});
  try {
    const w=dom.window;
    Object.defineProperty(w,"crypto",{value:webcrypto});w.TextEncoder=TextEncoder;w.AbortSignal=AbortSignal;
    w.matchMedia=()=>({matches:true});
    w.fetch=async(url:string,opts:any)=>fetch('http://127.0.0.1:'+port+new URL(url).pathname,opts);
    w.eval(script());
    const source=readFileSync(new URL("../../../testimonials.js",import.meta.url),"utf8");
    const rendering=source.slice(source.indexOf("const BATCH_SIZE"));
    w.eval('const testimonialData = '+JSON.stringify(all)+';\n'+rendering);
    for(let i=0;i<100 && w.document.querySelectorAll('.testimonial-card').length!==6;i++) await new Promise(r=>setTimeout(r,5));
    assert.equal(w.document.querySelectorAll('.testimonial-card').length,6);
    assert.doesNotMatch(w.document.getElementById('testimonialsGrid').textContent,/Synthetic stale SSR/);
    assert.ok(!Array.from(w.document.querySelectorAll('.testimonial-card strong')).some((n:any)=>n.textContent==='Synthetic'));
    assert.match(w.document.getElementById('loadMoreBtn').textContent,/2 weitere/);
    w.document.documentElement.setAttribute('data-lang','es');await w.refreshTestimonialLanguage();
    assert.match(w.document.getElementById('loadMoreBtn').textContent,/2 restantes/);
    w.document.getElementById('loadMoreBtn').click();
    for(let i=0;i<100 && w.document.querySelectorAll('.testimonial-card').length!==8;i++) await new Promise(r=>setTimeout(r,5));
    assert.equal(w.document.querySelectorAll('.testimonial-card').length,8);
    assert.equal(w.document.getElementById('loadMoreBtn').style.display,'none');
  } finally {dom.window.close();await new Promise<void>(resolve=>server.close(()=>resolve()));db.close();}
});
