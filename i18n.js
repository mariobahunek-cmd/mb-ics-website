/* ═══════════════════════════════════════════
   INTERNATIONALIZATION (DE / EN / ES)
   ═══════════════════════════════════════════ */

const translations = {
    de: {
        // Nav
        "nav.metrics": "Kennzahlen",
        "nav.about": "Über mich",
        "nav.training": "Trainings",
        "nav.corporate": "Für Unternehmen",
        "nav.contact": "Kontakt",
        "nav.cta": "Anfrage senden",

        // Hero
        "hero.badge": "SAP Certified Instructor",
        "hero.title1": "SAP S/4HANA",
        "hero.title2": "Training",
        "hero.subtitle": "Offizielle SAP Zertifizierungskurse und maßgeschneiderte Unternehmensschulungen in MM & SD. Weltweit verfügbar – auf Deutsch, Englisch und Spanisch. 100% virtuell.",
        "hero.cta1": "Trainings entdecken",
        "hero.cta2": "Kontakt aufnehmen",
        "hero.trust1": "Note 1.08",
        "hero.trust2": ">98% Bestehensquote",
        "hero.trust3": "250+ Teilnehmer",
        "hero.photo": "Foto folgt",
        "hero.float1": "SAP Certified",
        "hero.float2": "DE · EN · ES",

        // Metrics
        "metrics.tag": "Nachgewiesene Ergebnisse",
        "metrics.title": "Zahlen, die für sich sprechen",
        "metrics.subtitle": "Basierend auf ca. 250 Teilnehmern und über 60 verifizierten Bewertungen (2024–2026).",
        "metrics.pass": "Zertifizierungs-Bestehensquote",
        "metrics.rating": "Trainer-Gesamtbewertung",
        "metrics.ratingNote": "(Schulnotenskala: 1 = Sehr gut, 6 = Ungenügend)",
        "metrics.participants": "Geschulte Teilnehmer",
        "metrics.reviews": "Verifizierte Bewertungen",
        "metrics.interaction": "Interaktion",
        "metrics.engagement": "Aktives Engagement",
        "metrics.practice": "Zeit für Praxis",
        "metrics.didactic": "Didaktische Kompetenz",
        "metrics.delivery": "Durchführung",
        "metrics.preparation": "Vorbereitung",
        "metrics.expertise": "Fachkompetenz",
        "metrics.structure": "Struktur",

        // About
        "about.tag": "So trainiere ich",
        "about.title": "Sehen Sie selbst",
        "about.p1": "System-First statt PowerPoint. Meine Teilnehmer arbeiten vom ersten Tag an direkt im Live SAP S/4HANA System – mit echten End-to-End Prozessen.",
        "about.vid1title": "Creating Purchase Orders Using an Info Record",
        "about.vid2title": "SAP Beschaffungsprozess: Von der Bestellung bis zur Rechnungsprüfung",
        "about.vid3title": "Cómo Crear un Registro Maestro de Condiciones en SAP Fiori",
        "about.langDetail": "Deutsch · Englisch · Spanisch",
        "about.ytBtn": "Mehr Videos auf YouTube",

        // Training
        "training.tag": "Trainingsangebot",
        "training.title": "Offizielle SAP Zertifizierungskurse & mehr",
        "training.subtitle": "Von Foundation-Kursen bis zur Consultant-Zertifizierung – alles aus einer Hand.",
        "training.tabMM": "Sourcing & Procurement (MM)",
        "training.tabSD": "Sales & Distribution (SD)",
        "training.tabFI": "Foundation & FI",
        "training.academy": "Zertifizierungs-Akademie",
        "training.modules": "Einzelkurse",
        "training.mmModules": "MM Expertenkurse",
        "training.sdModules": "SD Expertenkurse",
        "training.fiModules": "Foundation & Financial Accounting",
        "training.ts450": "Grundlagen Beschaffung in S/4HANA",
        "training.ts452": "Vertiefte Beschaffungsprozesse & Zertifizierungsvorbereitung",
        "training.ts460": "Grundlagen Vertrieb in S/4HANA",
        "training.ts462": "Vertiefte Vertriebsprozesse & Zertifizierungsvorbereitung",
        "training.s4500": "Geschäftsprozesse",
        "training.s4520": "Einkauf",
        "training.s4510": "Bestandsführung",
        "training.s4515": "Rechnungsprüfung",
        "training.s4600": "Geschäftsprozesse",
        "training.s4605": "Auftragsabwicklung",
        "training.s4620": "Preisfindung",
        "training.s4610": "Versand & Transport",
        "training.s4615": "Faktura",
        "training.s4550": "Customizing",
        "training.s4650": "Customizing",
        "training.s4h00": "SAP S/4HANA Überblick",
        "training.s4h02": "S/4HANA Überblick (erweitert)",
        "training.s4f10": "Financial Accounting",
        "training.s4f17": "Anlagenbuchhaltung",

        // Corporate
        "corporate.tag": "Für Unternehmen",
        "corporate.title": "Maßgeschneiderte SAP Schulungen für Ihr Team",
        "corporate.subtitle": "Neben offiziellen Zertifizierungskursen biete ich individuell zugeschnittene Trainings für Unternehmen – abgestimmt auf Ihre Prozesse, Ihr System und Ihre Mitarbeiter.",
        "corporate.card1title": "System-First Training",
        "corporate.card1desc": "Hands-on im Live SAP S/4HANA System. Ihre Mitarbeiter lernen durch Praxis, nicht durch PowerPoint.",
        "corporate.card2title": "End-to-End Prozesse",
        "corporate.card2desc": "Procure-to-Pay, Order-to-Cash – Ihre Teams verstehen die gesamte Prozesskette, nicht nur einzelne Transaktionen.",
        "corporate.card3title": "Individuell zugeschnitten",
        "corporate.card3desc": "Inhalte abgestimmt auf Ihre Branche, Ihre SAP-Konfiguration und das Erfahrungslevel Ihrer Mitarbeiter.",
        "corporate.card4title": "Weltweit verfügbar",
        "corporate.card4desc": "100% virtuell. Vor-Ort-Trainings außerhalb der USA möglich. US Eastern Time, flexibel für Europa, Lateinamerika und Kanada.",
        "corporate.cta": "Unverbindliches Gespräch vereinbaren",

        // Contact
        "contact.tag": "Kontakt",
        "contact.title": "Lassen Sie uns sprechen",
        "contact.desc": "Ob Zertifizierungskurs oder maßgeschneidertes Unternehmenstraining – ich freue mich auf Ihre Anfrage.",
        "contact.location": "100% virtuell · Vor-Ort außerhalb der USA · US Eastern Time",
        "contact.name": "Name",
        "contact.email": "E-Mail",
        "contact.company": "Unternehmen (optional)",
        "contact.interest": "Interesse an",
        "contact.optCert": "SAP Zertifizierungskurs",
        "contact.optCorp": "Unternehmenstraining",
        "contact.optCons": "Beratung",
        "contact.optOther": "Sonstiges",
        "contact.message": "Nachricht",
        "contact.submit": "Nachricht senden"
    },

    en: {
        "nav.metrics": "Results",
        "nav.about": "About",
        "nav.training": "Training",
        "nav.corporate": "For Companies",
        "nav.contact": "Contact",
        "nav.cta": "Get in touch",

        "hero.badge": "SAP Certified Instructor",
        "hero.title1": "SAP S/4HANA",
        "hero.title2": "Training",
        "hero.subtitle": "Official SAP certification courses and tailored corporate training in MM & SD. Available worldwide – in German, English and Spanish. 100% virtual.",
        "hero.cta1": "Explore training",
        "hero.cta2": "Get in touch",
        "hero.trust1": "Grade 1.08",
        "hero.trust2": ">98% Pass Rate",
        "hero.trust3": "250+ Participants",
        "hero.photo": "Photo coming",
        "hero.float1": "SAP Certified",
        "hero.float2": "DE · EN · ES",

        "metrics.tag": "Proven Results",
        "metrics.title": "Numbers that speak for themselves",
        "metrics.subtitle": "Based on approx. 250 participants and 60+ verified reviews (2024–2026).",
        "metrics.pass": "Certification Pass Rate",
        "metrics.rating": "Overall Instructor Rating",
        "metrics.ratingNote": "(Grade scale: 1 = Excellent, 6 = Failing)",
        "metrics.participants": "Trained Participants",
        "metrics.reviews": "Verified Reviews",
        "metrics.interaction": "Interaction",
        "metrics.engagement": "Active Engagement",
        "metrics.practice": "Time for Practice",
        "metrics.didactic": "Didactic Competence",
        "metrics.delivery": "Delivery",
        "metrics.preparation": "Preparation",
        "metrics.expertise": "Subject Expertise",
        "metrics.structure": "Structure",

        "about.tag": "How I Train",
        "about.title": "See for Yourself",
        "about.p1": "System-First instead of PowerPoint. My participants work directly in the live SAP S/4HANA system from day one – with real end-to-end processes.",
        "about.vid1title": "Creating Purchase Orders Using an Info Record",
        "about.vid2title": "SAP Procurement Process: From Purchase Order to Invoice Verification",
        "about.vid3title": "Cómo Crear un Registro Maestro de Condiciones en SAP Fiori",
        "about.langDetail": "German · English · Spanish",
        "about.ytBtn": "More Videos on YouTube",

        "training.tag": "Training Portfolio",
        "training.title": "Official SAP Certification Courses & more",
        "training.subtitle": "From foundation courses to consultant certification – everything from one source.",
        "training.tabMM": "Sourcing & Procurement (MM)",
        "training.tabSD": "Sales & Distribution (SD)",
        "training.tabFI": "Foundation & FI",
        "training.academy": "Certification Academy",
        "training.modules": "Individual Courses",
        "training.mmModules": "MM Expert Courses",
        "training.sdModules": "SD Expert Courses",
        "training.fiModules": "Foundation & Financial Accounting",
        "training.ts450": "Procurement Fundamentals in S/4HANA",
        "training.ts452": "Advanced Procurement & Certification Prep",
        "training.ts460": "Sales Fundamentals in S/4HANA",
        "training.ts462": "Advanced Sales Processes & Certification Prep",
        "training.s4500": "Business Processes",
        "training.s4520": "Purchasing",
        "training.s4510": "Inventory Management",
        "training.s4515": "Invoice Verification",
        "training.s4600": "Business Processes",
        "training.s4605": "Sales Processing",
        "training.s4620": "Pricing",
        "training.s4610": "Shipping & Transport",
        "training.s4615": "Billing",
        "training.s4550": "Customizing",
        "training.s4650": "Customizing",
        "training.s4h00": "SAP S/4HANA Overview",
        "training.s4h02": "S/4HANA Overview (Extended)",
        "training.s4f10": "Financial Accounting",
        "training.s4f17": "Asset Accounting",

        "corporate.tag": "For Companies",
        "corporate.title": "Tailored SAP Training for your Team",
        "corporate.subtitle": "Beyond official certification courses, I offer customized training for companies – aligned with your processes, your system and your employees.",
        "corporate.card1title": "System-First Training",
        "corporate.card1desc": "Hands-on in the live SAP S/4HANA system. Your team learns by doing, not by PowerPoint.",
        "corporate.card2title": "End-to-End Processes",
        "corporate.card2desc": "Procure-to-Pay, Order-to-Cash – your teams understand the entire process chain, not just isolated transactions.",
        "corporate.card3title": "Custom-Tailored",
        "corporate.card3desc": "Content aligned with your industry, your SAP configuration and your team's experience level.",
        "corporate.card4title": "Available Worldwide",
        "corporate.card4desc": "100% virtual. On-site training available outside the US. US Eastern Time, flexible for Europe, Latin America and Canada.",
        "corporate.cta": "Schedule a free consultation",

        "contact.tag": "Contact",
        "contact.title": "Let's talk",
        "contact.desc": "Whether certification course or custom corporate training – I look forward to hearing from you.",
        "contact.location": "100% virtual · On-site available outside the US · US Eastern Time",
        "contact.name": "Name",
        "contact.email": "Email",
        "contact.company": "Company (optional)",
        "contact.interest": "Interested in",
        "contact.optCert": "SAP Certification Course",
        "contact.optCorp": "Corporate Training",
        "contact.optCons": "Consulting",
        "contact.optOther": "Other",
        "contact.message": "Message",
        "contact.submit": "Send message"
    },

    es: {
        "nav.metrics": "Resultados",
        "nav.about": "Sobre mí",
        "nav.training": "Formación",
        "nav.corporate": "Para empresas",
        "nav.contact": "Contacto",
        "nav.cta": "Contactar",

        "hero.badge": "Instructor SAP Certificado",
        "hero.title1": "SAP S/4HANA",
        "hero.title2": "Training",
        "hero.subtitle": "Cursos oficiales de certificación SAP y formación corporativa a medida en MM y SD. Disponible en todo el mundo – en alemán, inglés y español. 100% virtual.",
        "hero.cta1": "Descubrir formación",
        "hero.cta2": "Contactar",
        "hero.trust1": "Nota 1.08",
        "hero.trust2": ">98% Tasa de aprobación",
        "hero.trust3": "250+ Participantes",
        "hero.photo": "Foto próximamente",
        "hero.float1": "SAP Certificado",
        "hero.float2": "DE · EN · ES",

        "metrics.tag": "Resultados comprobados",
        "metrics.title": "Cifras que hablan por sí solas",
        "metrics.subtitle": "Basado en aprox. 250 participantes y más de 60 evaluaciones verificadas (2024–2026).",
        "metrics.pass": "Tasa de aprobación de certificación",
        "metrics.rating": "Valoración general del instructor",
        "metrics.ratingNote": "(Escala de notas: 1 = Excelente, 6 = Insuficiente)",
        "metrics.participants": "Participantes formados",
        "metrics.reviews": "Evaluaciones verificadas",
        "metrics.interaction": "Interacción",
        "metrics.engagement": "Compromiso activo",
        "metrics.practice": "Tiempo para práctica",
        "metrics.didactic": "Competencia didáctica",
        "metrics.delivery": "Ejecución",
        "metrics.preparation": "Preparación",
        "metrics.expertise": "Experiencia técnica",
        "metrics.structure": "Estructura",

        "about.tag": "Cómo entreno",
        "about.title": "Véalo usted mismo",
        "about.p1": "System-First en lugar de PowerPoint. Mis participantes trabajan directamente en el sistema SAP S/4HANA en vivo desde el primer día – con procesos reales de extremo a extremo.",
        "about.vid1title": "Creating Purchase Orders Using an Info Record",
        "about.vid2title": "Proceso de adquisición SAP: Del pedido a la verificación de facturas",
        "about.vid3title": "Cómo Crear un Registro Maestro de Condiciones en SAP Fiori",
        "about.langDetail": "Alemán · Inglés · Español",
        "about.ytBtn": "Más videos en YouTube",

        "training.tag": "Oferta formativa",
        "training.title": "Cursos oficiales de certificación SAP y más",
        "training.subtitle": "Desde cursos básicos hasta la certificación de consultor – todo de una sola fuente.",
        "training.tabMM": "Sourcing & Procurement (MM)",
        "training.tabSD": "Sales & Distribution (SD)",
        "training.tabFI": "Foundation & FI",
        "training.academy": "Academia de certificación",
        "training.modules": "Cursos individuales",
        "training.mmModules": "Cursos expertos MM",
        "training.sdModules": "Cursos expertos SD",
        "training.fiModules": "Foundation & Contabilidad financiera",
        "training.ts450": "Fundamentos de compras en S/4HANA",
        "training.ts452": "Compras avanzadas y prep. certificación",
        "training.ts460": "Fundamentos de ventas en S/4HANA",
        "training.ts462": "Ventas avanzadas y prep. certificación",
        "training.s4500": "Procesos empresariales",
        "training.s4520": "Compras",
        "training.s4510": "Gestión de inventario",
        "training.s4515": "Verificación de facturas",
        "training.s4600": "Procesos empresariales",
        "training.s4605": "Procesamiento de ventas",
        "training.s4620": "Fijación de precios",
        "training.s4610": "Envío y transporte",
        "training.s4615": "Facturación",
        "training.s4550": "Customizing",
        "training.s4650": "Customizing",
        "training.s4h00": "Visión general SAP S/4HANA",
        "training.s4h02": "Visión general S/4HANA (ampliada)",
        "training.s4f10": "Contabilidad financiera",
        "training.s4f17": "Contabilidad de activos",

        "corporate.tag": "Para empresas",
        "corporate.title": "Formación SAP a medida para su equipo",
        "corporate.subtitle": "Además de los cursos oficiales de certificación, ofrezco formación personalizada para empresas – adaptada a sus procesos, su sistema y sus empleados.",
        "corporate.card1title": "Formación System-First",
        "corporate.card1desc": "Práctica directa en el sistema SAP S/4HANA en vivo. Su equipo aprende haciendo, no con PowerPoint.",
        "corporate.card2title": "Procesos End-to-End",
        "corporate.card2desc": "Procure-to-Pay, Order-to-Cash – sus equipos entienden toda la cadena de procesos, no solo transacciones aisladas.",
        "corporate.card3title": "Personalizado",
        "corporate.card3desc": "Contenido adaptado a su industria, su configuración SAP y el nivel de experiencia de su equipo.",
        "corporate.card4title": "Disponible mundialmente",
        "corporate.card4desc": "100% virtual. Formación presencial disponible fuera de EE.UU. US Eastern Time, flexible para Europa, Latinoamérica y Canadá.",
        "corporate.cta": "Agendar una consulta gratuita",

        "contact.tag": "Contacto",
        "contact.title": "Hablemos",
        "contact.desc": "Ya sea un curso de certificación o formación corporativa personalizada – espero su consulta con gusto.",
        "contact.location": "100% virtual · Presencial fuera de EE.UU. · US Eastern Time",
        "contact.name": "Nombre",
        "contact.email": "Correo electrónico",
        "contact.company": "Empresa (opcional)",
        "contact.interest": "Interesado en",
        "contact.optCert": "Curso de certificación SAP",
        "contact.optCorp": "Formación corporativa",
        "contact.optCons": "Consultoría",
        "contact.optOther": "Otro",
        "contact.message": "Mensaje",
        "contact.submit": "Enviar mensaje"
    }
};

// ═══════ LANGUAGE SWITCH LOGIC ═══════
function setLanguage(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.setAttribute('lang', lang);

    // Update all translatable elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[lang] && translations[lang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[lang][key];
            } else if (el.tagName === 'OPTION') {
                el.textContent = translations[lang][key];
            } else {
                el.textContent = translations[lang][key];
            }
        }
    });

    // Update active state on all lang buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Save preference
    localStorage.setItem('preferredLang', lang);
}

// Init language switcher
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setLanguage(btn.dataset.lang);
    });
});

// Load saved preference or default to DE
const savedLang = localStorage.getItem('preferredLang') || 'de';
setLanguage(savedLang);
