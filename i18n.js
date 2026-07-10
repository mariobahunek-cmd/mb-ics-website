/* ═══════════════════════════════════════════
   RUNTIME UI STRINGS (DE / EN / ES)
   ═══════════════════════════════════════════
   The homepage is server-rendered per language on real URLs
   (/ = EN, /de/, /es/) from _data/i18n_home.json — there is no
   client-side language switching anymore. This file only keeps
   the strings main.js needs at runtime (form validation, submit
   states, toasts), keyed by <html data-lang>. */

const translations = {
    de: {
        "contact.errorRequired": "Dieses Feld ist erforderlich.",
        "contact.errorEmail": "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
        "contact.errorMinLength": "Bitte geben Sie mindestens 10 Zeichen ein.",
        "contact.sending": "Wird gesendet…",
        "contact.submit": "Nachricht senden",
        "contact.successTitle": "Nachricht gesendet!",
        "contact.successMsg": "Vielen Dank für Ihre Anfrage. Ich melde mich in Kürze bei Ihnen.",
        "contact.errorTitle": "Fehler beim Senden",
        "contact.errorMsg": "Die Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie direkt an mario@mb-ics.com.",
        "contact.mailtoSuccess": "E-Mail-Programm geöffnet!"
    },

    en: {
        "contact.errorRequired": "This field is required.",
        "contact.errorEmail": "Please enter a valid email address.",
        "contact.errorMinLength": "Please enter at least 10 characters.",
        "contact.sending": "Sending…",
        "contact.submit": "Send message",
        "contact.successTitle": "Message sent!",
        "contact.successMsg": "Thank you for your inquiry. I will get back to you shortly.",
        "contact.errorTitle": "Sending failed",
        "contact.errorMsg": "The message could not be sent. Please try again or email mario@mb-ics.com directly.",
        "contact.mailtoSuccess": "Email client opened!"
    },

    es: {
        "contact.errorRequired": "Este campo es obligatorio.",
        "contact.errorEmail": "Por favor, introduzca una dirección de correo válida.",
        "contact.errorMinLength": "Por favor, introduzca al menos 10 caracteres.",
        "contact.sending": "Enviando…",
        "contact.submit": "Enviar mensaje",
        "contact.successTitle": "¡Mensaje enviado!",
        "contact.successMsg": "Gracias por su consulta. Me pondré en contacto con usted en breve.",
        "contact.errorTitle": "Error al enviar",
        "contact.errorMsg": "No se pudo enviar el mensaje. Inténtelo de nuevo o escriba directamente a mario@mb-ics.com.",
        "contact.mailtoSuccess": "¡Cliente de correo abierto!"
    }
};
