import { sourceLink } from './trust-reviews.js';
// Selected recommendations come only from the current canonical public feed.
const BATCH_SIZE = 6;
let archiveEpoch = 0;
let requestedCount = BATCH_SIZE;
let archiveInitialization;
function getCurrentLang() {
  return document.documentElement.getAttribute('data-lang') || 'en';
}
function createTestimonialCard(record) {
  const card = document.createElement('article');
  card.className = 'testimonial-card';
  card.dataset.reviewId = record.id;
  const quote = document.createElement('div');
  quote.className = 'testimonial-card__quote';
  const text = document.createElement('p');
  text.textContent = record.comment;
  if (record.original_language) text.lang = record.original_language;
  text.style.whiteSpace = 'pre-wrap';
  quote.append(text);
  const author = document.createElement('div');
  author.className = 'testimonial-card__author';
  const name = document.createElement('strong');
  name.textContent = record.display_name;
  const source = document.createElement('span');
  source.className = 'testimonial-card__source';
  source.textContent = 'LinkedIn';
  author.append(name, source);
  card.append(quote, author, sourceLink(document, record, getCurrentLang()));
  return card;
}
async function renderCanonicalArchive(count) {
  const grid = document.getElementById('testimonialsGrid');
  const btn = document.getElementById('loadMoreBtn');
  const status = document.getElementById('testimonial-registry-status');
  if (!grid) return;
  const epoch = ++archiveEpoch;
  requestedCount = count;
  grid.replaceChildren();
  if (btn) btn.style.display = 'none';
  try {
    const records = await window.ReviewArchive.prepare(grid.dataset.canonicalApi);
    if (epoch !== archiveEpoch) return;
    for (const record of records.slice(0, count)) grid.append(createTestimonialCard(record));
    const lang = getCurrentLang();
    if (status) status.textContent = records.length ? '' : ({
      en: 'No rights-reviewed LinkedIn recommendations are currently published here. You can visit Mario’s LinkedIn profile below.',
      de: 'Hier sind derzeit keine rechtegeprüften LinkedIn-Empfehlungen veröffentlicht. Marios LinkedIn-Profil ist unten verlinkt.',
      es: 'Actualmente no hay recomendaciones de LinkedIn con derechos revisados publicadas aquí. El perfil de Mario está enlazado abajo.'
    }[lang] || 'No recommendations are currently published here.');
    if (btn) {
      const remaining = Math.max(0, records.length - count);
      btn.style.display = remaining ? '' : 'none';
      btn.textContent = ({de:`Mehr laden (${remaining} weitere)`,en:`Load more (${remaining} remaining)`,es:`Cargar más (${remaining} restantes)`})[lang] || 'Load more';
    }
  } catch {
    if (epoch !== archiveEpoch) return;
    grid.replaceChildren();
    if (status) status.textContent = status.dataset.unavailable || 'Recommendations temporarily unavailable.';
  }
}
function loadMoreTestimonials() { return renderCanonicalArchive(requestedCount + BATCH_SIZE); }
function refreshTestimonialLanguage() { return renderCanonicalArchive(requestedCount); }
function initializeTestimonialArchive() {
  if (!archiveInitialization) {
    document.getElementById('loadMoreBtn')?.addEventListener('click', loadMoreTestimonials);
    archiveInitialization = renderCanonicalArchive(BATCH_SIZE);
  }
  return archiveInitialization;
}
window.refreshTestimonialLanguage = refreshTestimonialLanguage;
window.loadMoreTestimonials = loadMoreTestimonials;
window.initializeTestimonialArchive = initializeTestimonialArchive;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeTestimonialArchive);
else initializeTestimonialArchive();
