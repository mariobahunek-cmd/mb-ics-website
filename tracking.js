// ============================================================================
// tracking.js — Marketing-Attribution + Consent-Updates für mb-ics.com
//
// Funktion:
// 1. GclidTracker — captured Ad-Click-IDs (gclid, gbraid, wbraid) und UTM-
//    Params aus der URL beim Seitenaufruf in localStorage. 90 Tage TTL
//    (Google-Ads-Attribution-Fenster). Last-Click-Win-Logik.
// 2. window.mbicsTracking.updateConsent({marketing, analytics}) — feuert
//    gtag('consent','update') mit den vom Cookie-Banner gewählten Werten.
// 3. window.mbicsTracking.fireLeadConversion({label, value, currency, email})
//    — feuert das Google-Ads-Conversion-Event nach erfolgreichem Lead-Submit
//    (z.B. Crashcourse-Notify-Form). Verhindert Doppel-Feuern per
//    sessionStorage-Guard und nutzt Enhanced Conversions (SHA-256-Email-Hash),
//    wenn crypto.subtle verfügbar ist.
// 4. window.mbicsTracking.readTracking() — gibt die gespeicherten Attribution-
//    Daten zurück, damit Form-Submits sie als Hidden-Fields mitschicken können.
//
// Voraussetzung: Im <head>-Inline-Snippet wurde bereits geladen:
//   - gtag.js (https://www.googletagmanager.com/gtag/js?id=AW-…)
//   - gtag('consent', 'default', { …denied, wait_for_update: 500 })
//   - gtag('config', 'AW-…'), gtag('config', 'G-…')
// ============================================================================

(function () {
  'use strict';

  var STORAGE_KEY = 'mbics_tracking';
  var TTL_MS = 90 * 24 * 60 * 60 * 1000;
  var URL_KEYS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function readTrackingFromUrl() {
    var sp = new URLSearchParams(window.location.search);
    var data = {};
    var found = false;
    for (var i = 0; i < URL_KEYS.length; i++) {
      var v = sp.get(URL_KEYS[i]);
      if (v) { data[URL_KEYS[i]] = v; found = true; }
    }
    if (!found) return null;
    data.timestamp = Date.now();
    return data;
  }

  function readTrackingFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data.timestamp || Date.now() - data.timestamp > TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return data;
    } catch (_) { return null; }
  }

  function captureTracking() {
    var fromUrl = readTrackingFromUrl();
    var existing = readTrackingFromStorage();
    var referrer;
    try {
      if (!existing && document.referrer) {
        var ref = new URL(document.referrer);
        if (ref.hostname && ref.hostname.indexOf('mb-ics.com') === -1) {
          referrer = ref.hostname;
        }
      }
    } catch (_) { /* ignore */ }

    if (fromUrl || referrer) {
      var merged = fromUrl || { timestamp: Date.now() };
      if (referrer && !merged.referrer) merged.referrer = referrer;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (_) { /* quota */ }
    }
  }

  function readTracking() {
    return readTrackingFromUrl() || readTrackingFromStorage();
  }

  // gtag-consent-update aus dem Cookie-Banner heraus aufgerufen.
  // marketing → ad_storage / ad_user_data / ad_personalization
  // analytics → analytics_storage
  function updateConsent(state) {
    if (typeof window.gtag !== 'function') return;
    var marketing = state && state.marketing === 'granted' ? 'granted' : 'denied';
    var analytics = state && state.analytics === 'granted' ? 'granted' : 'denied';
    window.gtag('consent', 'update', {
      ad_storage: marketing,
      ad_user_data: marketing,
      ad_personalization: marketing,
      analytics_storage: analytics
    });
  }

  function sha256Hex(text) {
    if (!window.crypto || !window.crypto.subtle) return Promise.resolve(null);
    var enc = new TextEncoder().encode(text);
    return window.crypto.subtle.digest('SHA-256', enc).then(function (buf) {
      var bytes = new Uint8Array(buf);
      var hex = '';
      for (var i = 0; i < bytes.length; i++) {
        hex += ('00' + bytes[i].toString(16)).slice(-2);
      }
      return hex;
    }).catch(function () { return null; });
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Feuert genau EIN Conversion-Event. Schutz gegen Doppel-Feuern via
  // sessionStorage. opts: { label, value, currency, email, transactionId }
  // - label: Google-Ads-Conversion-Label (Form: 'AW-XXX/yyy') — wird vom
  //   Caller mitgegeben, sodass eine Page mehrere Events feuern kann.
  // - email: optional, wird gehasht als user_data für Enhanced Conversions.
  function fireLeadConversion(opts) {
    if (typeof window.gtag !== 'function') return Promise.resolve(false);
    opts = opts || {};
    if (!opts.label) return Promise.resolve(false);

    var sessionKey = 'mbics_conv_fired_' + opts.label;
    try {
      if (sessionStorage.getItem(sessionKey)) return Promise.resolve(false);
      sessionStorage.setItem(sessionKey, '1');
    } catch (_) { /* sessionStorage disabled — fire anyway */ }

    var emailRaw = (opts.email || '').toString().trim().toLowerCase();
    var enhancedPromise = EMAIL_RE.test(emailRaw)
      ? sha256Hex(emailRaw).then(function (hash) {
          if (hash) window.gtag('set', 'user_data', { sha256_email_address: hash });
        })
      : Promise.resolve();

    return enhancedPromise.then(function () {
      var payload = { send_to: opts.label };
      if (typeof opts.value === 'number' && isFinite(opts.value) && opts.value >= 0) {
        payload.value = opts.value;
        payload.currency = opts.currency || 'USD';
      }
      if (opts.transactionId) payload.transaction_id = String(opts.transactionId);
      window.gtag('event', 'conversion', payload);
      return true;
    });
  }

  captureTracking();

  window.mbicsTracking = {
    readTracking: readTracking,
    updateConsent: updateConsent,
    fireLeadConversion: fireLeadConversion
  };
})();
