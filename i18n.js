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

        // Testimonials
        "testimonials.tag": "Teilnehmerstimmen",
        "testimonials.title": "Was Teilnehmer sagen",
        "testimonials.subtitle": "Echte Empfehlungen von LinkedIn – von internationalen Kursteilnehmern.",
        "testimonials.loadMore": "Mehr Bewertungen laden",
        "testimonials.q1": "\"Er hat die seltene Fähigkeit, die Business-Perspektive mit der technischen Seite von SAP S/4HANA zu verbinden. Wir haben nicht nur Order-to-Cash und Purchase-to-Pay geübt – wir haben auch verstanden, wie diese Flüsse direkt die Buchhaltung beeinflussen. Ich kann ihn ohne Zögern empfehlen!\"",
        "testimonials.q2": "\"Mario bringt eine seltene Mischung aus Expertise, Klarheit und Praxisrelevanz ins SAP Training. Er lehrt nicht nur SAP – er befähigt dich, es mit Selbstvertrauen zu nutzen. Ich empfehle ihn jedem, der schnell aufsteigen möchte.\"",
        "testimonials.q3": "\"Er verbindet Logistik und Finanzen so, dass alles Klick macht. Wenn du den Prozessfluss verstehen willst und was hinter den Kulissen in der Buchhaltung passiert, ist Mario der Trainer, den du brauchst.\"",
        "testimonials.q4": "\"Es war unheimlich interessant wie Sie uns SAP Themen beigebracht haben. Mit Ihrer Fachkompetenz konnten Sie jeden von uns überzeugen – auch für Einsteiger wie mich. Jedes Problem konnten Sie zügig lösen.\"",
        "testimonials.q5": "\"Mario hat ein echtes Talent: Er kann komplexe Inhalte von Grund auf verständlich und klar erklären, auch für Anfänger. Er ist nicht nur ein professioneller Dozent, sondern auch eine inspirierende Persönlichkeit.\"",
        "testimonials.q6": "\"Einer der besten Professoren bei COMCAVE College. Mario war eine geduldige, freundliche und detailorientierte Person. Er spricht außerdem Spanisch, was mir half, jede Frage in meiner Sprache stellen zu können.\"",
        "testimonials.r1": "Shipping Industry Professional",
        "testimonials.r2": "Maschinenbautechniker",
        "testimonials.r3": "Büromanagerin",
        "testimonials.r4": "Analytische Chemikerin",
        "testimonials.r5": "HR & Global Mobility",
        "testimonials.r6": "SAP S/4HANA Teilnehmerin",
        "testimonials.cta": "Alle Empfehlungen auf LinkedIn",

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
        "training.mmAcademy": "MM Academy Track",
        "training.sdAcademy": "SD Academy Track",
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

        // Testimonials
        "testimonials.tag": "Participant Voices",
        "testimonials.title": "What Participants Say",
        "testimonials.subtitle": "Real LinkedIn recommendations – from international course participants.",
        "testimonials.loadMore": "Load more reviews",
        "testimonials.q1": "\"He has a rare ability to connect the business perspective with the technical side of SAP S/4HANA. We didn't just practice Order-to-Cash and Purchase-to-Pay – we also understood how these flows directly affect accounting. I can recommend him without hesitation!\"",
        "testimonials.q2": "\"Mario brings a rare mix of expertise, clarity, and real-world relevance to SAP training. He doesn't just teach SAP – he empowers you to use it with confidence. I'd recommend him to anyone looking to level up fast.\"",
        "testimonials.q3": "\"He connects the dots between logistics and finance in a way that makes everything click. If you want to understand the process flow and what happens behind the scenes in accounting, Mario is the trainer you want.\"",
        "testimonials.q4": "\"It was incredibly interesting how you taught us SAP topics. With your expertise, you convinced every one of us – even beginners like me. Every problem was solved quickly and patiently.\"",
        "testimonials.q5": "\"Mario has a real talent: He can explain complex content from the ground up in a clear and understandable way, even for beginners. He is not only a professional instructor, but also an inspiring personality.\"",
        "testimonials.q6": "\"One of the best professors at COMCAVE College. Mario was patient, friendly, and detail-oriented. He also speaks Spanish, which helped me feel comfortable asking questions in my own language.\"",
        "testimonials.r1": "Shipping Industry Professional",
        "testimonials.r2": "Manufacturing Engineer",
        "testimonials.r3": "Office Manager",
        "testimonials.r4": "Analytical Chemist",
        "testimonials.r5": "HR & Global Mobility",
        "testimonials.r6": "SAP S/4HANA Participant",
        "testimonials.cta": "All Recommendations on LinkedIn",

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
        "training.mmAcademy": "MM Academy Track",
        "training.sdAcademy": "SD Academy Track",
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

        // Testimonials
        "testimonials.tag": "Voces de participantes",
        "testimonials.title": "Lo que dicen los participantes",
        "testimonials.subtitle": "Recomendaciones reales de LinkedIn – de participantes internacionales.",
        "testimonials.loadMore": "Cargar más opiniones",
        "testimonials.q1": "\"Tiene una habilidad única para conectar la perspectiva empresarial con el lado técnico de SAP S/4HANA. No solo practicamos Order-to-Cash y Purchase-to-Pay – también entendimos cómo estos flujos afectan directamente la contabilidad. ¡Lo recomiendo sin dudar!\"",
        "testimonials.q2": "\"Mario aporta una rara combinación de experiencia, claridad y relevancia práctica a la formación SAP. No solo enseña SAP – te capacita para usarlo con confianza. Lo recomendaría a cualquiera que quiera avanzar rápido.\"",
        "testimonials.q3": "\"Conecta logística y finanzas de una manera que hace que todo encaje. Si quieres entender el flujo de procesos y lo que pasa detrás de escena en contabilidad, Mario es el formador que necesitas.\"",
        "testimonials.q4": "\"Fue increíblemente interesante cómo nos enseñó los temas de SAP. Con su competencia profesional convenció a cada uno de nosotros – incluso a principiantes como yo. Cada problema fue resuelto rápidamente.\"",
        "testimonials.q5": "\"Mario tiene un verdadero talento: puede explicar contenidos complejos de forma comprensible y clara, incluso para principiantes. No es solo un instructor profesional, sino también una personalidad inspiradora.\"",
        "testimonials.q6": "\"Uno de los mejores profesores de COMCAVE College. Mario fue una persona paciente, amigable y orientada a los detalles. Además habla español y me ayudó a sentirme que podía expresar cualquier duda en este idioma.\"",
        "testimonials.r1": "Profesional de la industria naviera",
        "testimonials.r2": "Ingeniero de manufactura",
        "testimonials.r3": "Gerente de oficina",
        "testimonials.r4": "Química analítica",
        "testimonials.r5": "RRHH y Movilidad Global",
        "testimonials.r6": "Participante SAP S/4HANA",
        "testimonials.cta": "Todas las recomendaciones en LinkedIn",

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
        "training.mmAcademy": "MM Academy Track",
        "training.sdAcademy": "SD Academy Track",
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

    // Refresh testimonial cards for new language
    if (typeof refreshTestimonialLanguage === 'function') {
        refreshTestimonialLanguage();
    }
}

// Init language switcher
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setLanguage(btn.dataset.lang);
    });
});

// Detect language from saved preference or browser language
function detectLanguage() {
    // 1. Saved preference takes priority (user manually selected)
    const saved = localStorage.getItem('preferredLang');
    if (saved) return saved;

    // 2. Detect browser language (navigator.language = "de-DE", "en-US", "es-MX" etc.)
    const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();

    if (browserLang.startsWith('de')) return 'de';
    if (browserLang.startsWith('es')) return 'es';

    // Everything else → English (international default)
    return 'en';
}

setLanguage(detectLanguage());
