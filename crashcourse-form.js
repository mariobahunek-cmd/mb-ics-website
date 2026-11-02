document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('leadForm');
    if (!form) return;
    const button = document.getElementById('submitBtn');
    const error = document.getElementById('formError');
    let pending = false;
    let accepted = null;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (pending || !form.reportValidity()) return;
        const fields = form.elements;
        const data = new FormData();
        data.set('email', fields.email.value);
        data.set('first_name', fields.name.value);
        data.set('country', fields.country.value);
        data.set('role', fields.role.value);
        data.set('form_type', 'crashcourse-waitlist');
        data.set('source', 'sap-mm-crashcourse-landing');
        data.set('_subject', 'SAP MM cohort-launch updates');
        data.set('_replyto', fields.email.value);
        data.set('cohort_updates_consent', fields.consent.checked ? 'yes' : 'no');
        const tracking = window.mbicsTracking?.readTracking();
        if (tracking) {
            for (const key of ['gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_content','utm_term','referrer']) {
                if (tracking[key]) data.set('attr_' + key, tracking[key]);
            }
        }
        window.mbicsTracking?.sanitizeFormData(data);
        const fingerprint = JSON.stringify([...data.entries()]);
        if (accepted === fingerprint) return;
        pending = true; button.disabled = true; error.hidden = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: controller.signal, referrerPolicy: 'strict-origin-when-cross-origin' });
            const result = await response.json();
            if (!response.ok || !result || result.error || result.errors || (result.ok !== true && typeof result.next !== 'string')) throw new Error('Unconfirmed acceptance');
            accepted = fingerprint;
            form.hidden = true;
            document.getElementById('thankyou').hidden = false;
            // This event represents service acceptance only, not delivery or a qualified lead.
            // No user-provided field is copied into analytics.
            if (window.mbicsTracking?.getConsent().analytics === true && typeof window.gtag === 'function') {
                window.gtag('event', 'generate_lead', { form_id: 'crashcourse-waitlist' });
            }
        } catch (_) {
            error.textContent = 'Receipt is not confirmed. Your entries are preserved. You can try again; an interrupted response may already have reached the service, so a retry can create a duplicate.';
            error.hidden = false;
        } finally { clearTimeout(timeout); pending = false; button.disabled = false; }
    });
});
