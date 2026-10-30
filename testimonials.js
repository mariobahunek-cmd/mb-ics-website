import { sourceLink } from './trust-reviews.js';
// Selected recommendations come only from the current canonical public feed,
// every published source (ProvenExpert and LinkedIn), service order preserved.
const BATCH_SIZE = 6;
const COLLAPSE_THRESHOLD = 320;
const UI_TEXT = {
  en: { expand: 'Show more', collapse: 'Show less',
        empty: 'No rights-reviewed recommendations are currently published here.',
        loadMore: remaining => `Load more (${remaining} remaining)` },
  de: { expand: 'Mehr anzeigen', collapse: 'Weniger anzeigen',
        empty: 'Hier sind derzeit keine rechtegeprüften Empfehlungen veröffentlicht.',
        loadMore: remaining => `Mehr laden (${remaining} weitere)` },
  es: { expand: 'Ver más', collapse: 'Ver menos',
        empty: 'Actualmente no hay recomendaciones con derechos revisados publicadas aquí.',
        loadMore: remaining => `Cargar más (${remaining} restantes)` }
};
function ui(lang) { return UI_TEXT[lang] || UI_TEXT.en; }
function formatDate(iso, lang) {
  try {
    const d = new Date(iso + 'T00:00:00Z');
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(lang, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  } catch { return ''; }
}
let archiveEpoch = 0;
let requestedCount = BATCH_SIZE;
let archiveInitialization;
function getCurrentLang() {
  return document.documentElement.getAttribute('data-lang') || 'en';
}
function createTestimonialCard(record, lang) {
  const t = ui(lang);
  const card = document.createElement('article');
  card.className = 'testimonial-card';
  card.dataset.reviewId = record.id;
  const quote = document.createElement('div');
  quote.className = 'testimonial-card__quote';
  const text = document.createElement('p');
  text.textContent = record.comment; // plain text only – never inject HTML
  if (record.original_language) text.lang = record.original_language;
  text.style.whiteSpace = 'pre-wrap';
  quote.append(text);
  if (record.comment.length > COLLAPSE_THRESHOLD) {
    quote.classList.add('testimonial-card__quote--clamped');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'testimonial-card__toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = t.expand;
    toggle.addEventListener('click', () => {
      const expanded = quote.classList.toggle('testimonial-card__quote--expanded');
      quote.classList.toggle('testimonial-card__quote--clamped', !expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? t.collapse : t.expand;
    });
    quote.append(toggle);
  }
  const author = document.createElement('div');
  author.className = 'testimonial-card__author';
  const name = document.createElement('strong');
  name.textContent = record.display_name;
  const meta = document.createElement('span');
  meta.className = 'testimonial-card__meta';
  const sourceLabel = document.createElement('span');
  sourceLabel.textContent = record.source;
  meta.append(sourceLabel);
  const dateLabel = formatDate(record.original_date, lang);
  if (dateLabel) {
    const time = document.createElement('time');
    time.dateTime = record.original_date;
    time.textContent = dateLabel;
    meta.append(' · ', time);
  }
  // Show the record's own source rating only. Never average across foreign scales.
  if (Number.isFinite(record.source_rating) && Number.isFinite(record.source_scale)) {
    const rating = document.createElement('span');
    rating.className = 'testimonial-card__rating';
    rating.textContent = `${record.source_rating} / ${record.source_scale}`;
    meta.append(' · ', rating);
  }
  author.append(name, meta);
  card.append(quote, author, sourceLink(document, record, lang));
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
    const lang = getCurrentLang();
    for (const record of records.slice(0, count)) grid.append(createTestimonialCard(record, lang));
    if (status) status.textContent = records.length ? '' : ui(lang).empty;
    if (btn) {
      const remaining = Math.max(0, records.length - count);
      btn.style.display = remaining ? '' : 'none';
      btn.textContent = ui(lang).loadMore(remaining);
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
