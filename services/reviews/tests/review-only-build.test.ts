import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
// @ts-ignore Executable build-only JavaScript module.
import {buildReviewOnly} from '../scripts/build-review-only.mjs';
const assets=['reviews/index.html','de/bewertungen/index.html','es/opiniones/index.html','review/index.html','reviews/methodology/index.html','privacy.html','impressum.html','reviews.css','reviews.js','reviews-i18n.js','reviews-handoff.js','favicon.svg','style.css',...['DMSans-Regular-LatinExt','DMSans-Regular-Latin','DMSans-Italic-LatinExt','DMSans-Italic-Latin','PlayfairDisplay-Regular-LatinExt','PlayfairDisplay-Regular-Latin'].map(name=>'fonts/'+name+'.woff2')];
const archived={name:'Synthetic Archived Author',quote:{de:'Synthetic archived body DE',en:'Synthetic archived body EN',es:'Synthetic archived body ES'}};
function inputs(root:string){for(const p of assets){const dest=join(root,p);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,p.endsWith('.html')?'<html><meta name="reviews-api" content="https://synthetic.invalid"><body data-review-page="list"><div id="historical-list"></div><script src="/reviews.js" type="module"></script></body></html>':'/* Synthetic reviewed asset, no archive. */');}writeFileSync(join(root,'testimonials.js'),JSON.stringify(archived));mkdirSync(join(root,'old-history'));writeFileSync(join(root,'old-history/index.html'),archived.name+archived.quote.de);}
test('review-enabled isolated deployment candidate contains only canonical review pages/assets, no source archive/other quotes/history; input preserved',()=>{
 const dir=mkdtempSync(join(tmpdir(),'synthetic-review-build-')),built=join(dir,'input'),out=join(dir,'candidate');mkdirSync(built);inputs(built);
 try{const original=readFileSync(join(built,'testimonials.js'));const manifest=buildReviewOnly(built,out,[archived]);
 assert.equal(manifest.kind,'isolated-review-only-candidate-not-whole-brochure-release');assert.ok(!existsSync(join(out,'testimonials.js')));assert.ok(!existsSync(join(out,'old-history')));assert.ok(original.equals(readFileSync(join(built,'testimonials.js'))));
 for(const p of Object.keys(manifest.files)){const body=readFileSync(join(out,p),'utf8');assert.ok(!body.includes(archived.name));for(const quote of Object.values(archived.quote))assert.ok(!body.includes(quote));}
 for(const route of ['index.html','de/index.html','es/index.html'])assert.match(readFileSync(join(out,route),'utf8'),/id="historical-list"/);
 assert.throws(()=>buildReviewOnly(built,out,[archived]),/exists/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('candidate sanitization fails closed on archived author/body in any allowlisted asset, including encoded HTML',()=>{
 const dir=mkdtempSync(join(tmpdir(),'synthetic-review-build-leak-')),built=join(dir,'input'),out=join(dir,'candidate');mkdirSync(built);inputs(built);
 try{writeFileSync(join(built,'privacy.html'),'<p>Synthetic&#32;Archived&#32;Author</p>');assert.throws(()=>buildReviewOnly(built,out,[archived]),/retained archive/);assert.equal(existsSync(out),false);
 writeFileSync(join(built,'privacy.html'),'<p>safe</p>');writeFileSync(join(built,'reviews.js'),JSON.stringify(archived.quote.es));assert.throws(()=>buildReviewOnly(built,out,[archived]),/retained archive/);assert.equal(existsSync(out),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
