import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
// @ts-ignore Build-only executable JavaScript.
import {buildReviewOnly} from '../scripts/build-review-only.mjs';
const assets=['reviews/index.html','de/bewertungen/index.html','es/opiniones/index.html','review/index.html','reviews/methodology/index.html','privacy.html','impressum.html','reviews.css','reviews.js','reviews-i18n.js','reviews-handoff.js','trust-reviews.js','favicon.svg','style.css',...['DMSans-Regular-LatinExt','DMSans-Regular-Latin','DMSans-Italic-LatinExt','DMSans-Italic-Latin','PlayfairDisplay-Regular-LatinExt','PlayfairDisplay-Regular-Latin'].map(n=>'fonts/'+n+'.woff2')];
const archive=[{name:'Synthetic archived author',quote:{de:'Synthetic archived quote'}}];
function inputs(root:string){for(const p of assets){const dest=join(root,p);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,p.endsWith('.html')?'<html><body data-review-page="list"><div id="historical-list"></div><script type="module" src="/reviews.js"></script></body></html>':'/* Synthetic safe asset */');}}
test('F03 full HTML/CSS/module dependency and fragment closure; analytics removed only from derived legal shell with original legal text/source intact',()=>{
 const dir=mkdtempSync(join(tmpdir(),'synthetic-closure-')),built=join(dir,'input'),out=join(dir,'candidate');mkdirSync(built);inputs(built);
 try{
  const legal='<html><head><link rel="icon" href="favicon.svg"><link rel="stylesheet" href="style.css"><link rel="dns-prefetch" href="https://www.googletagmanager.com"><script src="https://www.googletagmanager.com/gtag/js?id=synthetic"></script><script>window.dataLayer=[];function gtag(){}</script></head><body><h1 id="participant-reviews">Synthetic legal text</h1><a href="/reviews/#historical-list">Review details</a><script src="tracking.js"></script></body></html>';
  writeFileSync(join(built,'privacy.html'),legal);writeFileSync(join(built,'impressum.html'),legal);writeFileSync(join(built,'style.css'),`@font-face{src:url("fonts/DMSans-Regular-Latin.woff2")} .noise{background:url("data:image/svg+xml,%3Cfilter%20id='url(%23n)'/%3E")}`);writeFileSync(join(built,'reviews.js'),'import "./reviews-i18n.js";');
  const m=buildReviewOnly(built,out,archive);for(const p of ['favicon.svg','style.css','fonts/DMSans-Regular-Latin.woff2'])assert.ok(existsSync(join(out,p)));
  assert.equal(readFileSync(join(built,'privacy.html'),'utf8'),legal);const derived=readFileSync(join(out,'privacy.html'),'utf8');assert.match(derived,/Synthetic legal text/);assert.match(derived,/id="participant-reviews"/);assert.ok(!derived.includes('tracking.js'));assert.ok(!derived.includes('googletagmanager'));assert.ok(!derived.includes('window.dataLayer'));
  assert.equal(m.dependency_closure.missing,0);assert.ok(m.dependency_closure.html_references>0);assert.equal(m.analytics_added,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('F03 broken local href/src/fragment, CSS font dependencies and module imports fail closed before output exists',()=>{
 const dir=mkdtempSync(join(tmpdir(),'synthetic-closure-fail-')),built=join(dir,'input');mkdirSync(built);
 try{for(const [file,body] of [['privacy.html','<a href="/reviews/#missing-fragment">Broken</a>'],['impressum.html','<img src="/missing.svg">'],['style.css','a{background:url("fonts/missing.woff2")}'],['reviews.js','import "./missing.js";']]){inputs(built);writeFileSync(join(built,file),body);const out=join(dir,'candidate');assert.throws(()=>buildReviewOnly(built,out,archive),/dependency|fragment/);assert.equal(existsSync(out),false);}}
 finally{rmSync(dir,{recursive:true,force:true});}
});
