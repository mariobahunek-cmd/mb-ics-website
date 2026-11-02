// Consent v2. No optional attribution or Google tag before an explicit choice.
// Attribution lasts for this browser tab's session; no cross-visit attribution.
(function () {
  'use strict';
  if (window.mbicsTracking) return;
  var KEY = 'mbics_consent_v2';
  var TRACKING = 'mbics_tracking';
  var FIELDS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referrer'];
  var GA = 'G-73EMQX5W68';
  var state = { analytics: null, marketing: null, video: null };
  var googleLoaded = false;
  var gaConfigured = false;
  var pendingConversions = new Set();
  function storedState() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && saved.version === 2) return saved;
      // Old "all" could have come from the defective video button: ask again.
      if (localStorage.getItem('cookieConsent') === 'necessary') return { analytics: false, marketing: false, video: null };
    } catch (_) { /* Storage unavailable: keep this page's choice in memory. */ }
    return { analytics: null, marketing: null, video: null };
  }
  function isTrackingField(name) { return FIELDS.indexOf(name.replace(/^attr_/, '')) !== -1; }
  function clearAttribution() {
    try { localStorage.removeItem(TRACKING); sessionStorage.removeItem(TRACKING); } catch (_) {}
    document.querySelectorAll('input[type="hidden"]').forEach(function (input) {
      if (isTrackingField(input.name)) { input.value = ''; input.disabled = true; }
    });
  }
  function capture() {
    if (state.marketing !== true) { clearAttribution(); return; }
    try {
      localStorage.removeItem(TRACKING); // Remove legacy 90-day data, never migrate it.
      var query = new URLSearchParams(location.search), data = {}, found = false;
      FIELDS.filter(function (key) { return key !== 'referrer'; }).forEach(function (key) {
        var value = query.get(key);
        if (value) { data[key] = value.slice(0, 500); found = true; }
      });
      if (found) sessionStorage.setItem(TRACKING, JSON.stringify(data));
    } catch (_) {}
  }
  function readTracking() {
    if (state.marketing !== true) { clearAttribution(); return null; }
    try {
      var raw = JSON.parse(sessionStorage.getItem(TRACKING));
      if (!raw || typeof raw !== 'object') return null;
      var result = {};
      FIELDS.forEach(function (key) { if (typeof raw[key] === 'string') result[key] = raw[key].slice(0, 500); });
      return Object.keys(result).length ? result : null;
    } catch (_) { return null; }
  }
  function rawTag() { window.dataLayer.push(arguments); }
  function consentFlags() {
    return { analytics_storage: state.analytics === true ? 'granted' : 'denied',
      ad_storage: state.marketing === true ? 'granted' : 'denied',
      ad_user_data: state.marketing === true ? 'granted' : 'denied',
      ad_personalization: state.marketing === true ? 'granted' : 'denied' };
  }
  function clearGoogleCookies() {
    document.cookie.split(';').forEach(function (entry) {
      var name = entry.trim().split('=')[0];
      if (!/^(_ga(?:_|$)|_gid$|_gat|_gcl_)/.test(name)) return;
      var parts = location.hostname.split('.');
      var domains = ['', location.hostname];
      for (var i = 0; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
      domains.forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
      });
    });
  }
  function applyGoogle() {
    window['ga-disable-' + GA] = state.analytics !== true;
    if (!googleLoaded && (state.analytics === true || state.marketing === true)) {
      googleLoaded = true;
      window.dataLayer = window.dataLayer || [];
      rawTag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      rawTag('set', 'ads_data_redaction', true);
      rawTag('set', 'url_passthrough', false);
      rawTag('js', new Date());
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA;
      document.head.appendChild(script);
    }
    if (googleLoaded) {
      rawTag('consent', 'update', consentFlags());
      if (state.marketing !== true) rawTag('set', 'user_data', null);
      if (state.analytics === true && !gaConfigured) {
        gaConfigured = true;
        // Do not forward arbitrary query strings, hashes or referrer parameters.
        var referrer = '';
        try { var ref = new URL(document.referrer); referrer = ref.origin + ref.pathname; } catch (_) {}
        rawTag('config', GA, { page_location: location.origin + location.pathname, page_referrer: referrer });
      }
    }
    if (state.analytics !== true && state.marketing !== true) clearGoogleCookies();
  }
  // Existing callers may use gtag, but cannot queue events while consent is absent.
  window.gtag = function () {
    var args = arguments;
    if (args[0] === 'event' && (args[1] === 'conversion' ? state.marketing === true : state.analytics === true)) rawTag.apply(null, args);
  };
  function apply(next, persist) {
    ['analytics', 'marketing', 'video'].forEach(function (key) {
      if (key in next) state[key] = typeof next[key] === 'boolean' ? next[key] : null;
    });
    if (persist) {
      try { localStorage.setItem(KEY, JSON.stringify(Object.assign({ version: 2 }, state))); localStorage.removeItem('cookieConsent'); } catch (_) {}
    }
    capture();
    applyGoogle();
    window.dispatchEvent(new CustomEvent('mbics:consent', { detail: Object.assign({}, state) }));
  }
  function setConsent(next) { apply(next, true); }
  function sanitizeFormData(data) {
    if (state.marketing === true) return;
    Array.from(data.keys()).forEach(function (key) { if (isTrackingField(key)) data.delete(key); });
  }
  // Covers existing and dynamically added hidden fields, including legacy attr_*.
  document.addEventListener('submit', function () { if (state.marketing !== true) clearAttribution(); }, true);
  document.addEventListener('formdata', function (event) { sanitizeFormData(event.formData); }, true);
  document.addEventListener('DOMContentLoaded', function () { if (state.marketing !== true) clearAttribution(); });
  window.addEventListener('storage', function (event) { if (event.key === KEY || event.key === null || event.key === 'cookieConsent') apply(storedState(), false); });
  function fireLeadConversion(opts) {
    opts = opts || {};
    if (state.marketing !== true || !opts.label || pendingConversions.has(opts.label)) return Promise.resolve(false);
    var key = 'mbics_conv_fired_' + opts.label;
    try { if (sessionStorage.getItem(key)) return Promise.resolve(false); } catch (_) {}
    pendingConversions.add(opts.label);
    // No enhanced email conversion: a marketing toggle is not a separate email-sharing choice.
    return Promise.resolve().then(function () {
      if (state.marketing !== true) return false;
      var payload = { send_to: opts.label };
      if (typeof opts.value === 'number' && isFinite(opts.value) && opts.value >= 0) { payload.value = opts.value; payload.currency = opts.currency || 'USD'; }
      if (opts.transactionId) payload.transaction_id = String(opts.transactionId);
      window.gtag('event', 'conversion', payload);
      try { sessionStorage.setItem(key, '1'); } catch (_) {}
      return true;
    }).finally(function () { pendingConversions.delete(opts.label); });
  }
  window.mbicsTracking = {
    readTracking: readTracking, setConsent: setConsent,
    getConsent: function () { return Object.assign({}, state); },
    updateConsent: function (next) { setConsent({ marketing: next?.marketing === 'granted', analytics: next?.analytics === 'granted' }); },
    sanitizeFormData: sanitizeFormData, fireLeadConversion: fireLeadConversion
  };
  apply(storedState(), false);
})();
