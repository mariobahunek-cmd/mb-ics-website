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
        "contact.successTitle": "Vom Formulardienst angenommen",
        "contact.successMsg": "Der Formulardienst hat Ihre Anfrage angenommen. Die Zustellung an unser Postfach ist damit noch nicht bestätigt.",
        "contact.errorTitle": "Eingang nicht bestätigt",
        "contact.errorMsg": "Der Eingang konnte nicht bestätigt werden. Ihre Eingaben bleiben erhalten. Ein erneuter Versuch oder eine zusätzliche E-Mail kann bei einer unterbrochenen Verbindung zu einer doppelten Anfrage führen. Ein E-Mail-Entwurf muss von Ihnen selbst abgesendet werden.",
        "contact.draftSubject": "Website-Anfrage"
    },

    en: {
        "contact.errorRequired": "This field is required.",
        "contact.errorEmail": "Please enter a valid email address.",
        "contact.errorMinLength": "Please enter at least 10 characters.",
        "contact.sending": "Sending…",
        "contact.submit": "Send message",
        "contact.successTitle": "Accepted by the form service",
        "contact.successMsg": "The form service accepted your inquiry. Delivery to our mailbox is not yet confirmed.",
        "contact.errorTitle": "Receipt not confirmed",
        "contact.errorMsg": "We could not confirm receipt. Your entries are preserved. Retrying or sending an additional email after an interrupted connection may create a duplicate inquiry. You must send an email draft yourself.",
        "contact.draftSubject": "Website inquiry"
    },

    es: {
        "contact.errorRequired": "Este campo es obligatorio.",
        "contact.errorEmail": "Por favor, introduzca una dirección de correo válida.",
        "contact.errorMinLength": "Por favor, introduzca al menos 10 caracteres.",
        "contact.sending": "Enviando…",
        "contact.submit": "Enviar mensaje",
        "contact.successTitle": "Aceptado por el servicio de formularios",
        "contact.successMsg": "El servicio de formularios ha aceptado su consulta. La entrega a nuestro buzón aún no está confirmada.",
        "contact.errorTitle": "Recepción no confirmada",
        "contact.errorMsg": "No pudimos confirmar la recepción. Sus datos se conservan. Reintentar o enviar otro correo tras una interrupción puede duplicar la consulta. Debe enviar el borrador de correo usted mismo.",
        "contact.draftSubject": "Consulta desde el sitio web"
    }
};
