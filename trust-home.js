import { renderLatest } from './trust-reviews.js';
import { translations } from './reviews-i18n.js';
const root=document.querySelector('[data-trust-reviews]');
if(root) {
  const lang=document.documentElement.lang || 'en';
  const api=document.querySelector('meta[name="reviews-api"]')?.content;
  if(api) fetch(api.replace(/\/$/,'')+'/v1/reviews?sort=newest&limit=3',{
    credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)
  }).then(async response=>{if(!response.ok)throw new Error('unavailable');return response.json();})
    .then(data=>renderLatest(root,data,lang))
    .catch(()=>{root.querySelector('[data-trust-summary]').textContent=(translations[lang] || translations.en).failure;});
}
