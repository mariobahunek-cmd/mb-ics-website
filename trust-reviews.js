import { translations } from './reviews-i18n.js';
export function renderLatest(root, data, lang = 'en') {
  const t = translations[lang] || translations.en;
  const box = root.querySelector('[data-trust-summary]');
  const list = root.querySelector('[data-trust-latest]');
  box.replaceChildren(); list.replaceChildren();
  root.dataset.state = data.summary.count ? 'has' : 'empty';
  if (!data.summary.count) { box.textContent = t.empty; return; }
  box.textContent = `${new Intl.NumberFormat(lang, {maximumFractionDigits:2}).format(data.summary.mean)} / 5 · ${data.summary.count} ${t.count}`;
  const items = [...data.items].sort((a,b) => b.published_at-a.published_at || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  for (const r of items.slice(0,3)) list.append(reviewCard(root.ownerDocument,r,lang));
}
export function sourceLink(doc, record, lang='en') {
  const copy={en:['Original recommendation','LinkedIn profile · not the exact recommendation','Original source link not available'],de:['Originalempfehlung','LinkedIn-Profil · nicht die konkrete Empfehlung','Original-Quellenlink nicht verfügbar'],es:['Recomendación original','Perfil de LinkedIn · no la recomendación exacta','Enlace original no disponible']}[lang] || ['Original recommendation','LinkedIn profile · not the exact recommendation','Original source link not available'];
  for(const [key,index] of [['recommendation_url',0],['profile_url',1]]) {
    try { const u=new URL(record[key]);if(u.protocol!=='https:' || !['www.linkedin.com','linkedin.com'].includes(u.hostname) || u.username || u.password)continue;
      const a=doc.createElement('a');a.href=u.href;a.textContent=copy[index];a.target='_blank';a.rel='noopener noreferrer';return a;
    } catch { /* Missing or untrusted source is not a fabricated link. */ }
  }
  const span=doc.createElement('span');span.className='source-unavailable';span.textContent=copy[2];return span;
}
export function reviewCard(doc,r,lang='en') {
  const t=translations[lang] || translations.en;
  const el=(tag,value,cls) => {const n=doc.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
  const card=el('article',undefined,'review-card');card.dataset.reviewId=r.id;
  const time=el('time',new Intl.DateTimeFormat(lang,{timeZone:'UTC'}).format(new Date(r.published_at)));
  time.dateTime=new Date(r.published_at).toISOString();
  const comment=el('p',r.comment || '', 'review-comment');
  if(r.original_language)comment.lang=r.original_language;
  card.append(el('h3',r.display_name || t.anonymous),el('p',`${r.stars} / 5 ${t.stars}`,'stars'),time,
    el('p',`${r.course_category}${r.course_month ? ' · '+r.course_month : ''}`,'metadata'),comment,
    el('p',r.verification_level==='email_only' ? t.emailOnly : t.verificationUnknown,'metadata'));
  return card;
}
