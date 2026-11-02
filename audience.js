/* Functional language selection and editable inquiry context. No analytics events. */
document.addEventListener('DOMContentLoaded', () => {
    const languages = { en: 'English', de: 'Deutsch', es: 'Español' };
    const homes = { en: '/', de: '/de/', es: '/es/' };
    const preferenceKey = 'mbics_language_v1';
    const validLanguage = value => Object.hasOwn(languages, value);
    const readPreference = () => {
        try { const value = localStorage.getItem(preferenceKey); return validLanguage(value) ? value : null; }
        catch (_) { return null; }
    };
    document.querySelectorAll('a.lang-btn, a[data-language]').forEach(link => {
        link.addEventListener('click', () => {
            const target = new URL(link.href, location.href);
            if (target.origin !== location.origin) return;
            const lang = link.dataset.language || (target.pathname.startsWith('/de/') ? 'de' : target.pathname.startsWith('/es/') ? 'es' : 'en');
            if (validLanguage(lang)) { try { localStorage.setItem(preferenceKey, lang); } catch (_) {} }
        });
    });
    const suggestion = document.getElementById('languageSuggestion');
    const suggestedLink = document.getElementById('suggestedLanguageLink');
    const isEnglishRoot = location.pathname === '/' || location.pathname === '/index.html';
    if (suggestion && suggestedLink && isEnglishRoot) {
        const browserLanguages = navigator.languages || [navigator.language];
        const preferred = readPreference() || browserLanguages.map(x => x.split('-')[0].toLowerCase()).find(validLanguage);
        if (preferred && preferred !== document.documentElement.lang) {
            document.getElementById('suggestedLanguage').textContent = languages[preferred];
            suggestedLink.href = homes[preferred];
            suggestedLink.addEventListener('click', () => { try { localStorage.setItem(preferenceKey, preferred); } catch (_) {} });
            suggestion.hidden = false;
        }
    }
    document.getElementById('dismissLanguageSuggestion')?.addEventListener('click', () => { suggestion.hidden = true; });
    document.getElementById('clearLanguagePreference')?.addEventListener('click', () => {
        try { localStorage.removeItem(preferenceKey); } catch (_) {}
        const status = document.getElementById('languagePreferenceStatus');
        if (status) status.textContent = status.dataset.cleared;
        if (suggestion) suggestion.hidden = true;
    });

    const form = document.getElementById('contactForm');
    const purposes = new Set(['corporate', 'education', 'partner', 'certification', 'consulting', 'other']);
    const topics = {
        en: { procurement: 'Procurement: purchase order, goods receipt and invoice verification', 'purchase-order': 'Purchase orders and purchasing info records', pricing: 'SD pricing conditions and quantity scales' },
        de: { procurement: 'Beschaffung: Bestellung, Wareneingang und Rechnungsprüfung', 'purchase-order': 'Bestellungen und Einkaufsinfosätze', pricing: 'SD-Preiskonditionen und Mengenstaffeln' },
        es: { procurement: 'Compras: pedido, entrada de mercancías y verificación de facturas', 'purchase-order': 'Pedidos y registros info de compras', pricing: 'Condiciones de precio y escalas en SD' }
    };
    const lang = validLanguage(document.documentElement.lang) ? document.documentElement.lang : 'en';
    const setIfUnedited = (id, value) => {
        const field = form?.querySelector('#' + id);
        if (!field || field.dataset.userEdited === 'true') return;
        field.value = value;
    };
    const prefill = context => {
        if (!form || !context) return;
        if (purposes.has(context.inquiry)) setIfUnedited('interest', context.inquiry);
        if (Object.hasOwn(topics[lang], context.topic)) {
            setIfUnedited('topic', topics[lang][context.topic]);
            document.getElementById('contactOptions').open = true;
        }
    };
    form?.querySelectorAll('input,select,textarea').forEach(field => {
        ['input','change'].forEach(type => field.addEventListener(type, () => { field.dataset.userEdited = 'true'; }));
    });
    form?.addEventListener('reset', () => { form.querySelectorAll('[data-user-edited]').forEach(field => delete field.dataset.userEdited); });
    document.querySelectorAll('[data-inquiry]').forEach(link => link.addEventListener('click', () => {
        prefill({ inquiry: link.dataset.inquiry, topic: link.dataset.topic });
    }));
    const params = new URLSearchParams(location.search);
    const context = { inquiry: params.get('inquiry'), topic: params.get('topic') };
    prefill(context);
    // Only public enumerated context may cross a page boundary, never contact inputs.
    document.querySelectorAll('a[data-preserve-inquiry]').forEach(link => {
        if (!purposes.has(context.inquiry)) return;
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin) return;
        url.searchParams.set('inquiry', context.inquiry);
        if (Object.hasOwn(topics[lang], context.topic)) url.searchParams.set('topic', context.topic);
        link.href = url.pathname + url.search + url.hash;
    });
    window.mbicsAudience = Object.freeze({ prefill });
});
