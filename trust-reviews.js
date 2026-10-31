import { translations } from './reviews-i18n.js';
import { CERT_INVENTORY, BOOK_INVENTORY, certLabel, bookLabel } from './course-options.js';
export function renderLatest(root, data, lang = 'en') {
  const t = translations[lang] || translations.en;
  const box = root.querySelector('[data-trust-summary]');
  const list = root.querySelector('[data-trust-latest]');
  box.replaceChildren(); list.replaceChildren();
  // Owner correction 2026-10-31: the direct-review block lives inside the
  // personal-review section and stays completely hidden while there is
  // nothing to show — no empty-state announcement, no pooled average.
  if (!data.summary.count) { root.hidden = true; return; }
  root.hidden = false;
  box.textContent = `${data.summary.count} ${t.directCount}`;
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
// Optional public course context (2026-10-31 consent): participant-provided
// books/certifications, published only when the record carries the server-
// validated course_context. Rendered as plain text with readable names and
// small codes — an own indication, never a verified credential. Unknown or
// malformed codes are hidden fail-closed; absent context renders nothing,
// so legacy cards keep their exact previous structure.
function courseContextNode(doc, r, lang, t) {
  const cc = r.course_context;
  if (!cc || typeof cc !== 'object') return null;
  const filter = (list, inventory) =>
    Array.isArray(list)
      ? list.filter((c) => typeof c === 'string' && inventory.includes(c))
      : [];
  const certs = filter(cc.certifications, CERT_INVENTORY);
  const books = filter(cc.books, BOOK_INVENTORY);
  if (certs.length === 0 && books.length === 0) return null;
  const wrap = doc.createElement('div');
  wrap.className = 'review-course-context';
  const line = (legend, codes, labeler) => {
    const p = doc.createElement('p');
    p.className = 'review-course-context__line';
    const label = doc.createElement('span');
    label.className = 'review-course-context__label';
    label.textContent = legend + ': ';
    const codesEl = doc.createElement('span');
    codesEl.className = 'review-course-context__codes';
    codesEl.textContent = codes.map((c) => labeler(c, lang)).join(' · ');
    p.append(label, codesEl);
    return p;
  };
  if (certs.length) wrap.append(line(t.certLegend, certs, certLabel));
  if (books.length) wrap.append(line(t.booksLegend, books, bookLabel));
  return wrap;
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
    el('p',`${r.course_category}${r.course_month ? ' · '+r.course_month : ''}`,'metadata'),comment);
  const ctx = courseContextNode(doc,r,lang,t);
  if (ctx) card.append(ctx);
  card.append(el('p',r.verification_level==='email_only' ? t.emailOnly : t.verificationUnknown,'metadata'));
  return card;
}
