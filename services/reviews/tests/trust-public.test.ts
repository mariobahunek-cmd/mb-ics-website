import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// @ts-ignore locked dev dependency
import { JSDOM } from 'jsdom';
const root = new URL('../../../', import.meta.url);
async function moduleValue() { return import(new URL('trust-reviews.js', root).href); }
function fixture(lang='en') { return new JSDOM(`<html lang="${lang}"><body><section data-trust-reviews><div data-trust-summary></div><div data-trust-latest></div></section></body></html>`); }
test('TRUST participant release allowlist retains the shared safe card module',()=>{
 const source=readFileSync(new URL('services/reviews/scripts/build-review-only.mjs',root),'utf8');assert.match(source,/'trust-reviews.js'/);
});
const review = (id:string, stars:number, date:number, comment='Original\n  text <img src=x onerror=alert(1)>') => ({id, stars, published_at:date, comment, display_name:'', course_category:'MM',course_month:'2026-09',original_language:'de',verification_level:'email_only'});
test('TRUST zero homepage has honest empty state and no manufactured average or stars', async()=>{
 const m=await moduleValue(),dom=fixture();
 m.renderLatest(dom.window.document.querySelector('section'),{items:[],summary:{count:0,mean:null,distribution:{1:0,2:0,3:0,4:0,5:0}}},'en');
 assert.match(dom.window.document.body.textContent!,/No website reviews/);
 assert.doesNotMatch(dom.window.document.body.textContent!,/\/ 5|NaN/);
 assert.equal(dom.window.document.querySelectorAll('article').length,0);dom.window.close();
});
for (const size of [1,5]) test(`TRUST ${size} latest cards are chronological rating-neutral exact-text and XSS-safe`,async()=>{
 const m=await moduleValue(),dom=fixture();
 const items=Array.from({length:size},(_,i)=>review(String(i),i===size-1?1:5,1000+i));
 m.renderLatest(dom.window.document.querySelector('section'),{items,summary:{count:size,mean:2.5,distribution:{}},historical:{count:900,mean:5}},'en');
 const cards=[...dom.window.document.querySelectorAll('article')];
 assert.equal(cards.length,Math.min(size,3));assert.equal(cards[0].getAttribute('data-review-id'),String(size-1));
 assert.match(cards[0].textContent!,/1 \/ 5/);assert.match(cards[0].textContent!,/Email confirmed.*not verified/);
 assert.match(cards[0].textContent!,/Anonymous/);assert.match(cards[0].textContent!,/MM.*2026-09/);
 assert.equal(cards[0].querySelector('.review-comment')!.textContent,items[0].comment);
 assert.equal(cards[0].querySelector('img'),null);assert.equal(cards[0].querySelector('time')!.getAttribute('datetime'),new Date(1000+size-1).toISOString());
 assert.match(dom.window.document.querySelector('[data-trust-summary]')!.textContent!,new RegExp(`${size} published website reviews`));
 assert.doesNotMatch(dom.window.document.body.textContent!,/900/);dom.window.close();
});
test('TRUST equal-date order follows canonical id DESC and unknown verification is not upgraded',async()=>{
 const m=await moduleValue(),dom=fixture();const items=[review('a',5,1000),{...review('z',1,1000),verification_level:'other'}];
 m.renderLatest(dom.window.document.querySelector('section'),{items,summary:{count:2,mean:3}},'en');
 assert.equal(dom.window.document.querySelector('article')!.getAttribute('data-review-id'),'z');
 assert.doesNotMatch(dom.window.document.querySelector('article')!.textContent!,/Email confirmed/);dom.window.close();
});
for(const lang of ['en','de','es']) test(`TRUST ${lang} coherent categories trust notice CTA navigation and provenance`,async()=>{
 const m=await moduleValue();const data=JSON.parse(readFileSync(new URL('_data/i18n_home.json',root),'utf8'));
 for(const key of ['trust.title','trust.notice','trust.cta','trust.all','trust.historical','trust.linkedin','trust.historyNote','trust.sourceNote','nav.reviews']) assert.ok(data[lang][key],key);
 const t=(await import(new URL('reviews-i18n.js',root).href)).translations[lang];assert.ok(t.verificationUnknown);assert.ok(t.trustNotice);assert.ok(t.directTitle);
 const home=readFileSync(new URL('_includes/home.html',root),'utf8');
 assert.match(home,/data-trust-reviews/);assert.match(home,/trust-home.js/);assert.match(home,/data-trust-latest/);
 assert.ok(home.indexOf('data-trust-reviews')>home.indexOf('id="testimonials"'));assert.ok(home.indexOf('data-trust-reviews')<home.indexOf('id="about"'));
 assert.ok((home.match(/t\['nav.reviews'\]/g)||[]).length>=2);assert.match(home,/https:\/\/mb-ics.com\/review\//);
 const paths:any={en:'reviews/index.html',de:'de/bewertungen/index.html',es:'es/opiniones/index.html'};
 const list=readFileSync(new URL(paths[lang],root),'utf8');assert.match(list,/data-i18n="trustNotice"/);assert.match(list,/data-i18n="directTitle"/);assert.match(list,/id="course-evaluations"/);
 assert.match(data[lang]['metrics.rating'],/Preparation|Vorbereitung|Preparación/);
 assert.doesNotMatch(data[lang]['faq.a4'],/overall instructor|Gesamtbewertung|general del instructor|verified reviews|verifizierten Bewertungen|evaluaciones verificadas/);
});
test('TRUST safe source links distinguish recommendation from profile and missing evidence',async()=>{
 const m=await moduleValue(),dom=fixture();
 const exact=m.sourceLink(dom.window.document,{recommendation_url:'https://www.linkedin.com/feed/update/urn:li:activity:123/'},'en');assert.match(exact.textContent,/recommendation/i);
 const profile=m.sourceLink(dom.window.document,{profile_url:'https://www.linkedin.com/in/example/'},'en');assert.match(profile.textContent,/profile.*not.*exact/i);
 const missing=m.sourceLink(dom.window.document,{},'en');assert.equal(missing.tagName,'SPAN');assert.match(missing.textContent,/not.*available/i);
 const unsafe=m.sourceLink(dom.window.document,{recommendation_url:'javascript:alert(1)'},'en');assert.equal(unsafe.tagName,'SPAN');dom.window.close();
});
