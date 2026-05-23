/* ═══════════════════════════════════════════
   INTERNATIONALIZATION (DE / EN / ES)
   ═══════════════════════════════════════════ */

const translations = {
    de: {
        // Nav
        "nav.metrics": "Kennzahlen",
        "nav.about": "Videos",
        "nav.training": "SAP Kurse",
        "nav.testimonials": "Empfehlungen",
        "nav.partners": "Für Partner",
        "nav.corporate": "Für Unternehmen",
        "nav.contact": "Kontakt",
        "nav.cta": "Anfrage senden",

        // Hero
        "hero.badge": "SAP Certified Instructor",
        "hero.title1": "SAP S/4HANA",
        "hero.title2": "Curriculum Training",
        "hero.subtitle": "Offizielles MM-Curriculum (TS450 / TS452) und maßgeschneiderte Procurement-Schulungen für interne SAP-Teams und globale Trainingspartner. Auslieferung in Deutsch, Englisch und Spanisch — über europäische, nordamerikanische und LATAM-Zeitzonen.",
        "hero.cta1": "Trainingsangebot anfragen",
        "hero.cta2": "Curriculum ansehen",
        "hero.trust1": "Note 1.08 (von 6)",
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
        "contact.optSelect": "Bitte wählen…",
        "contact.optCert": "SAP Zertifizierungskurs",
        "contact.optCorp": "Unternehmenstraining",
        "contact.optCons": "Beratung",
        "contact.optOther": "Sonstiges",
        "contact.message": "Nachricht",
        "contact.submit": "Nachricht senden",
        "contact.errorRequired": "Dieses Feld ist erforderlich.",
        "contact.errorEmail": "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
        "contact.errorMinLength": "Bitte geben Sie mindestens 10 Zeichen ein.",
        "contact.sending": "Wird gesendet…",
        "contact.successTitle": "Nachricht gesendet!",
        "contact.successMsg": "Vielen Dank für Ihre Anfrage. Ich melde mich in Kürze bei Ihnen.",
        "contact.errorTitle": "Fehler beim Senden",
        "contact.errorMsg": "Die Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie direkt an mario@mb-ics.com.",
        "contact.mailtoSuccess": "E-Mail-Programm geöffnet!",

        // Video Aria-Labels
        "about.vid1aria": "Video abspielen: Purchase Orders mit Info Record erstellen (Englisch)",
        "about.vid2aria": "Video abspielen: SAP Beschaffungsprozess (Deutsch)",
        "about.vid3aria": "Video abspielen: Konditionsmaster in SAP Fiori erstellen (Spanisch)",

        // Training Details
        "training.duration": "Dauer",
        "training.days5": "5 Tage",

        // Training — Crashcourse (alternative format)
        "training.crashBadge": "Alternative · Waitlist",
        "training.crashTitle": "MM Crashcourse — C_TS452_2601",
        "training.crashName": "3-Tage-Intensiv für die Consultant-Zertifizierung",
        "training.crashDesc": "Komprimierte Live-Vorbereitung auf C_TS452_2601 — für erfahrene Berater und Big-Four-Cohorts, die keine zweiwöchige Academy brauchen. Aktuell auf Warteliste.",
        "training.crashCta": "→ Zur Warteliste",

        // Contact extras
        "contact.responseTime": "Antwort innerhalb von 24 Stunden",
        "contact.whatsapp": "WhatsApp",

        // FAQ
        "faq.tag": "Häufige Fragen",
        "faq.title": "Häufig gestellte Fragen",
        "faq.subtitle": "Antworten auf die wichtigsten Fragen rund um SAP Trainings und Zertifizierungen.",
        "faq.q1": "Was sind offizielle SAP Zertifizierungskurse?",
        "faq.a1": "Das sind standardisierte, von SAP Education autorisierte Kurse, die auf die offizielle SAP-Berater-Zertifizierungsprüfung vorbereiten. Ich biete die Academy Tracks für MM (TS450/TS452) und SD (TS460/TS462) an.",
        "faq.q2": "Wie werden die Trainings durchgeführt?",
        "faq.a2": "Alle Trainings sind 100% virtuell mit Hands-on-Praxis im Live SAP S/4HANA System ab Tag 1. Kein PowerPoint – System-First-Lernen mit echten End-to-End Prozessen.",
        "faq.q3": "In welchen Sprachen werden Trainings angeboten?",
        "faq.a3": "Alle Trainings sind auf Deutsch, Englisch und Spanisch verfügbar. Die Kurssprache kann flexibel an die Bedürfnisse Ihres Teams angepasst werden.",
        "faq.q4": "Wie hoch ist die Bestehensquote bei der Zertifizierung?",
        "faq.a4": "Meine Teilnehmer erreichen eine Bestehensquote von über 98%, bei einer Trainer-Gesamtbewertung von 1,08 (Skala 1–6, 1 = Sehr gut). Basierend auf ca. 250 Teilnehmern und über 60 verifizierten Bewertungen.",
        "faq.q5": "Bieten Sie auch maßgeschneiderte Unternehmensschulungen an?",
        "faq.a5": "Ja, neben offiziellen Zertifizierungskursen biete ich individuelle Unternehmensschulungen an – abgestimmt auf Ihre Prozesse, Ihre SAP-Konfiguration und das Erfahrungslevel Ihres Teams. Weltweit verfügbar.",
        "faq.q6": "Wie kann ich ein Training buchen?",
        "faq.a6": "Nutzen Sie einfach das Kontaktformular, schreiben Sie an mario@mb-ics.com oder rufen Sie +1 954 836 9350 an. Ich antworte innerhalb von 24 Stunden.",

        // Cookie Banner
        "cookie.text": "Wir nutzen Google Analytics 4, um zu verstehen, woher unsere Besucher kommen — nur mit Ihrer Zustimmung. Bis dahin läuft das Tag im Consent-Denied-Modus. Bei Video-Wiedergabe werden Daten an YouTube (Google) übertragen. Schriften werden lokal gehostet. Weitere Informationen in unserer",
        "cookie.link": "Datenschutzerklärung",
        "cookie.accept": "Alle akzeptieren",
        "cookie.necessary": "Nur notwendige",

        // Footer
        "footer.privacy": "Datenschutz",
        "footer.impressum": "Impressum",
        "footer.cookieSettings": "Cookie-Einstellungen",

        // Blog
        "nav.blog": "Blog",
        "blog.tag": "Blog",
        "blog.title": "MM für Berater. Mit LATAM-Brille, wo es zählt.",
        "blog.subtitle": "Fundiertes SAP-MM-Wissen für DACH-Berater und Senior Consultants — alle zwei Wochen, mit eigenständigem internationalem Ausblick auf BR, MX, CO und die Branchen Öl/Gas und Automotive.",
        "blog.filterAll": "Alle",
        "blog.filterLatam": "Mit LATAM-Bezug",
        "blog.filterCore": "Reines MM-Kern",
        "blog.readingTime": "Min Lesezeit",
        "blog.minutes": "Min",
        "blog.readPost": "Beitrag lesen →",
        "blog.relatedPosts": "Weitere Beiträge",
        "blog.tagLatam": "LATAM",
        "blog.tagCore": "MM-Core",
        "blog.tagWithLatam": "Mit LATAM-Bezug",
        "blog.altLangAvailable": "Diesen Beitrag auf Englisch lesen",
        "blog.breadcrumbHome": "Start",
        "blog.emptyTitle": "Erste Beiträge folgen in Kürze.",
        "blog.emptyBody": "Der Redaktionsplan steht — alle zwei Wochen erscheint ein neuer Beitrag. Auf LinkedIn vernetzen, um keinen zu verpassen.",
        "blog.linkedinCta": "Auf LinkedIn vernetzen",
        "blog.sourcesTitle": "Quellen",

        // Cross-Promo (Berater-Training; sekundär berater.sapprep.de — KEIN sapprep.de)
        "crossPromo.tag": "Persönliche TS452-Begleitung",
        "crossPromo.title": "Du bereitest TS452 selbst vor und willst echten Sparringspartner statt Self-Service?",
        "crossPromo.body": "Ich biete als SAP Certified Instructor (>98% Bestehensquote, Note 1.08) persönliche Berater-Trainings für MM. Kein Standard-Curriculum, sondern abgestimmt auf deine Lücken, deine Branche und dein Klausurdatum.",
        "crossPromo.ctaPrimary": "Berater-Training anfragen",
        "crossPromo.ctaSecondary": "Auf LinkedIn vernetzen",
        "crossPromo.hint": "Demnächst",
        "crossPromo.hintBody": "berater.sapprep.de — Selbstlern-Plattform für TS452 mit Fragen-Pool, Mock-Klausuren und Erklärvideos. In Vorbereitung.",

        // Disclaimer LATAM
        "disclaimer.latamTitle": "Hinweis zu LATAM-Inhalten",
        "disclaimer.latamIntro": "Steuer- und Rechtsregeln in Lateinamerika ändern sich häufig. Stand der Aussagen:",
        "disclaimer.latamOutro": "Vor produktiver Anwendung im Customizing oder Rollout immer den aktuellen Stand bei der zuständigen Behörde und im SAP Help Portal verifizieren. Dieser Beitrag ersetzt keine Steuer- oder Rechtsberatung.",

        // Partners (B2B Training Provider engagement)
        "partners.tag": "Für Trainingsprovider",
        "partners.title": "Zusammenarbeit mit Trainingsprovidern",
        "partners.subtitle": "Wenn du eine Trainingsorganisation für SAP-Enterprise-Kunden betreibst, arbeite ich als curriculum-konformer Delivery-Partner.",
        "partners.card1title": "Offizielles SAP-Curriculum",
        "partners.card1desc": "Ausrichtung an TS450 / TS452 (MM) heute, TS460 / TS462 (SD) im Ausbau über 2026.",
        "partners.card2title": "International & dreisprachig",
        "partners.card2desc": "Erfahrung mit Cohorts aus DACH, EU, Nordamerika und LATAM — Auslieferung in Deutsch, Englisch und Spanisch.",
        "partners.card3title": "Kommerzielle Frameworks",
        "partners.card3desc": "Vertraut mit Right-to-Represent, NDAs, Sub-Contracting und Co-Delivery.",
        "partners.card4title": "Zeitzonen-Flexibilität",
        "partners.card4desc": "Regelmäßige Auslieferung über US-Eastern, MEZ und LATAM-Geschäftszeiten.",
        "partners.cta": "Partneranfrage senden",

        // Resources (small sapprep.de end-user mention)
        "resources.tag": "Ressourcen für Endanwender",
        "resources.text": "Für Endanwender und Quereinsteiger — getrennt von meiner B2B-Trainingsarbeit — betreibe ich sapprep.de, eine Self-Service-Lernplattform mit rollenbasierten Übungsinhalten für Einkauf, Vertrieb, Buchhaltung und Lager.",
        "resources.cta": "Zu sapprep.de →",

        // Paths / Audience
        "paths.tag": "Drei Zielgruppen",
        "paths.title": "Für wen ich trainiere",
        "paths.enterpriseBadge": "Hauptangebot",
        "paths.enterpriseLabel": "Unternehmen · Inhouse-Teams",
        "paths.enterpriseTitle": "Maßgeschneiderte Programme",
        "paths.enterpriseDesc": "Custom MM-Trainings für interne SAP-Teams — Einkauf, Bestand, Rechnungsprüfung, Customizing. Aufgebaut auf deinem S/4HANA-Setup.",
        "paths.enterpriseCta": "Programm besprechen ↓",
        "paths.partnerBadge": "B2B-Partner",
        "paths.partnerLabel": "Trainingsprovider · Partner",
        "paths.partnerTitle": "Curriculum-konforme Co-Delivery",
        "paths.partnerDesc": "White-Label-Durchführung des offiziellen SAP-Curriculums (TS450 / TS452, SD im Ausbau über 2026). Right-to-Represent, internationale Kohorten, drei Sprachen.",
        "paths.partnerCta": "Partneranfrage stellen ↓",
        "paths.enduserBadge": "Externe Plattform",
        "paths.enduserLabel": "SAP-Anwender · Quereinsteiger",
        "paths.enduserTitle": "sapprep.de",
        "paths.enduserDesc": "Self-Service-Lernplattform mit rollenbasierten Übungsinhalten für Einkauf, Vertrieb, Buchhaltung und Lager.",
        "paths.enduserCta": "Zur Plattform sapprep.de →"
    },

    en: {
        "nav.metrics": "Results",
        "nav.about": "Videos",
        "nav.training": "SAP Courses",
        "nav.testimonials": "Testimonials",
        "nav.partners": "For Partners",
        "nav.corporate": "For Enterprises",
        "nav.contact": "Contact",
        "nav.cta": "Get in touch",

        "hero.badge": "SAP Certified Instructor",
        "hero.title1": "SAP S/4HANA",
        "hero.title2": "Curriculum Training",
        "hero.subtitle": "Official MM curriculum (TS450 / TS452) and tailored procurement training for enterprise SAP teams and global training partners. Delivered in English, German, and Spanish — across European, North American, and LATAM time zones.",
        "hero.cta1": "Request a Training Proposal",
        "hero.cta2": "View Curriculum",
        "hero.trust1": "Grade 1.08 (of 6)",
        "hero.trust2": ">98% Pass Rate",
        "hero.trust3": "250+ Trainees",
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

        "corporate.tag": "For Enterprises",
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
        "contact.optSelect": "Please select…",
        "contact.optCert": "SAP Certification Course",
        "contact.optCorp": "Corporate Training",
        "contact.optCons": "Consulting",
        "contact.optOther": "Other",
        "contact.message": "Message",
        "contact.submit": "Send message",
        "contact.errorRequired": "This field is required.",
        "contact.errorEmail": "Please enter a valid email address.",
        "contact.errorMinLength": "Please enter at least 10 characters.",
        "contact.sending": "Sending…",
        "contact.successTitle": "Message sent!",
        "contact.successMsg": "Thank you for your inquiry. I will get back to you shortly.",
        "contact.errorTitle": "Sending failed",
        "contact.errorMsg": "The message could not be sent. Please try again or email mario@mb-ics.com directly.",
        "contact.mailtoSuccess": "Email client opened!",

        // Video Aria-Labels
        "about.vid1aria": "Play video: Creating Purchase Orders Using an Info Record (English)",
        "about.vid2aria": "Play video: SAP Procurement Process (German)",
        "about.vid3aria": "Play video: Creating a Condition Master Record in SAP Fiori (Spanish)",

        // Training Details
        "training.duration": "Duration",
        "training.days5": "5 days",

        // Training — Crashcourse (alternative format)
        "training.crashBadge": "Alternative · Waitlist",
        "training.crashTitle": "MM Crashcourse — C_TS452_2601",
        "training.crashName": "3-Day Intensive for the Consultant Certification",
        "training.crashDesc": "Compressed live preparation for C_TS452_2601 — for experienced consultants and Big Four cohorts who don't need a two-week academy. Currently on waitlist.",
        "training.crashCta": "→ Join Waitlist",

        // Contact extras
        "contact.responseTime": "Response within 24 hours",
        "contact.whatsapp": "WhatsApp",

        // FAQ
        "faq.tag": "FAQ",
        "faq.title": "Frequently Asked Questions",
        "faq.subtitle": "Answers to the most common questions about SAP training and certification.",
        "faq.q1": "What are official SAP certification courses?",
        "faq.a1": "These are standardized courses authorized by SAP Education that prepare for the official SAP consultant certification exam. I offer the MM (TS450/TS452) and SD (TS460/TS462) academy tracks.",
        "faq.q2": "How are the trainings conducted?",
        "faq.a2": "All trainings are 100% virtual with hands-on practice in a live SAP S/4HANA system from day one. No PowerPoint – system-first learning with real end-to-end processes.",
        "faq.q3": "What languages are trainings available in?",
        "faq.a3": "All trainings are available in German, English, and Spanish. The course language can be flexibly adapted to your team's needs.",
        "faq.q4": "What is the certification pass rate?",
        "faq.a4": "My participants achieve a pass rate of over 98%, with an overall instructor rating of 1.08 (scale 1–6, 1 = Excellent). Based on approx. 250 participants and 60+ verified reviews.",
        "faq.q5": "Do you offer tailored corporate training?",
        "faq.a5": "Yes, beyond official certification courses, I offer customized corporate training – aligned with your processes, your SAP configuration, and your team's experience level. Available worldwide.",
        "faq.q6": "How can I book a training?",
        "faq.a6": "Simply use the contact form, email mario@mb-ics.com, or call +1 954 836 9350. I respond within 24 hours.",

        // Cookie Banner
        "cookie.text": "We use Google Analytics 4 to understand where our visitors come from — only with your consent. Until then the tag runs in consent-denied mode. Playing videos will transmit data to YouTube (Google). Fonts are hosted locally. For more information, see our",
        "cookie.link": "Privacy Policy",
        "cookie.accept": "Accept all",
        "cookie.necessary": "Necessary only",

        // Footer
        "footer.privacy": "Privacy Policy",
        "footer.impressum": "Legal Notice",
        "footer.cookieSettings": "Cookie settings",

        // Blog
        "nav.blog": "Blog",
        "blog.tag": "Blog",
        "blog.title": "MM for consultants. With a LATAM lens where it matters.",
        "blog.subtitle": "Solid SAP MM knowledge for consultants and senior advisors — every two weeks, with an independent international perspective on BR, MX, CO and the oil/gas and automotive verticals.",
        "blog.filterAll": "All",
        "blog.filterLatam": "With LATAM perspective",
        "blog.filterCore": "Pure MM core",
        "blog.readingTime": "min read",
        "blog.minutes": "min",
        "blog.readPost": "Read post →",
        "blog.relatedPosts": "More posts",
        "blog.tagLatam": "LATAM",
        "blog.tagCore": "MM-Core",
        "blog.tagWithLatam": "With LATAM perspective",
        "blog.altLangAvailable": "Read this article in German",
        "blog.breadcrumbHome": "Home",
        "blog.emptyTitle": "First posts coming soon.",
        "blog.emptyBody": "The editorial plan is set — a new post goes live every two weeks. Connect on LinkedIn to follow along.",
        "blog.linkedinCta": "Connect on LinkedIn",
        "blog.sourcesTitle": "Sources",

        // Cross-Promo (consultant training; secondary berater.sapprep.de — NOT sapprep.de)
        "crossPromo.tag": "Personal TS452 mentoring",
        "crossPromo.title": "Preparing for TS452 on your own and want a real sparring partner — not just self-service?",
        "crossPromo.body": "As a SAP Certified Instructor (>98% pass rate, instructor rating 1.08 of 6), I run individual consultant trainings for MM — not a stock curriculum, but tailored to your gaps, your industry, and your exam date.",
        "crossPromo.ctaPrimary": "Request consultant training",
        "crossPromo.ctaSecondary": "Connect on LinkedIn",
        "crossPromo.hint": "Coming soon",
        "crossPromo.hintBody": "berater.sapprep.de — self-study platform for TS452 with question pool, mock exams and explainer videos. In preparation.",

        // Disclaimer LATAM
        "disclaimer.latamTitle": "Note on LATAM content",
        "disclaimer.latamIntro": "Tax and legal rules across Latin America change frequently. Statements in this article reflect the state as of:",
        "disclaimer.latamOutro": "Always verify the current state with the relevant authority and the SAP Help Portal before applying anything in production customizing or a rollout. This article does not constitute tax or legal advice.",

        // Partners
        "partners.tag": "For Training Providers",
        "partners.title": "Partnering With Training Providers",
        "partners.subtitle": "If you operate a training organization serving enterprise SAP clients, I work as a curriculum-aligned delivery partner.",
        "partners.card1title": "Official SAP Curriculum",
        "partners.card1desc": "Aligned with TS450 / TS452 (MM) today, TS460 / TS462 (SD) expanding through 2026.",
        "partners.card2title": "International & Trilingual",
        "partners.card2desc": "Experience with cohorts from DACH, broader EU, North America, and LATAM — delivered in English, German, and Spanish.",
        "partners.card3title": "Commercial Frameworks",
        "partners.card3desc": "Familiar with Right-to-Represent, NDAs, sub-contracting, and co-delivery arrangements.",
        "partners.card4title": "Time-Zone Flexibility",
        "partners.card4desc": "Regular delivery across US Eastern, Central European, and LATAM business hours.",
        "partners.cta": "Send a Partner Inquiry",

        // Resources
        "resources.tag": "Resources for End Users",
        "resources.text": "For end-users and career changers — separate from my B2B training work — I operate sapprep.de, a self-service learning platform with role-based practice content for procurement, sales, finance, and warehouse roles.",
        "resources.cta": "Visit sapprep.de →",

        // Paths / Audience
        "paths.tag": "Three audiences",
        "paths.title": "Who I train",
        "paths.enterpriseBadge": "Primary offering",
        "paths.enterpriseLabel": "Enterprises · In-House Teams",
        "paths.enterpriseTitle": "Tailored MM programs",
        "paths.enterpriseDesc": "Custom MM training for internal SAP teams — procurement, inventory, invoice verification, customizing. Built around your S/4HANA configuration.",
        "paths.enterpriseCta": "Discuss your program ↓",
        "paths.partnerBadge": "B2B partnership",
        "paths.partnerLabel": "Training Providers · Partners",
        "paths.partnerTitle": "Curriculum-aligned co-delivery",
        "paths.partnerDesc": "White-label delivery of the official SAP curriculum (TS450 / TS452, SD expanding through 2026). Right-to-Represent, international cohorts, three delivery languages.",
        "paths.partnerCta": "Send a partner inquiry ↓",
        "paths.enduserBadge": "External platform",
        "paths.enduserLabel": "SAP Users · Career Changers",
        "paths.enduserTitle": "sapprep.de",
        "paths.enduserDesc": "Self-service learning platform with role-based practice content for procurement, sales, finance, and warehouse roles.",
        "paths.enduserCta": "Visit sapprep.de →"
    },

    es: {
        "nav.metrics": "Resultados",
        "nav.about": "Videos",
        "nav.training": "Cursos SAP",
        "nav.testimonials": "Recomendaciones",
        "nav.partners": "Para partners",
        "nav.corporate": "Para empresas",
        "nav.contact": "Contacto",
        "nav.cta": "Contactar",

        "hero.badge": "Instructor SAP Certificado",
        "hero.title1": "SAP S/4HANA",
        "hero.title2": "Curriculum & Formación",
        "hero.subtitle": "Currículum oficial de MM (TS450 / TS452) y formaciones de procurement a medida para equipos SAP corporativos y partners de formación globales. Impartido en inglés, alemán y español — en zonas horarias europeas, norteamericanas y de Latinoamérica.",
        "hero.cta1": "Solicitar propuesta",
        "hero.cta2": "Ver currículum",
        "hero.trust1": "Nota 1.08 (de 6)",
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
        "contact.optSelect": "Seleccionar…",
        "contact.optCert": "Curso de certificación SAP",
        "contact.optCorp": "Formación corporativa",
        "contact.optCons": "Consultoría",
        "contact.optOther": "Otro",
        "contact.message": "Mensaje",
        "contact.submit": "Enviar mensaje",
        "contact.errorRequired": "Este campo es obligatorio.",
        "contact.errorEmail": "Por favor, introduzca una dirección de correo válida.",
        "contact.errorMinLength": "Por favor, introduzca al menos 10 caracteres.",
        "contact.sending": "Enviando…",
        "contact.successTitle": "¡Mensaje enviado!",
        "contact.successMsg": "Gracias por su consulta. Me pondré en contacto con usted en breve.",
        "contact.errorTitle": "Error al enviar",
        "contact.errorMsg": "No se pudo enviar el mensaje. Inténtelo de nuevo o escriba directamente a mario@mb-ics.com.",
        "contact.mailtoSuccess": "¡Cliente de correo abierto!",

        // Video Aria-Labels
        "about.vid1aria": "Reproducir video: Crear pedidos de compra con registro info (Inglés)",
        "about.vid2aria": "Reproducir video: Proceso de adquisición SAP (Alemán)",
        "about.vid3aria": "Reproducir video: Crear registro maestro de condiciones en SAP Fiori (Español)",

        // Training Details
        "training.duration": "Duración",
        "training.days5": "5 días",

        // Training — Crashcourse (alternative format)
        "training.crashBadge": "Alternativa · Lista de espera",
        "training.crashTitle": "MM Crashcourse — C_TS452_2601",
        "training.crashName": "Intensivo de 3 días para la certificación de consultor",
        "training.crashDesc": "Preparación en vivo comprimida para C_TS452_2601 — para consultores experimentados y cohortes Big Four que no necesitan una academia de dos semanas. Actualmente en lista de espera.",
        "training.crashCta": "→ Unirse a la lista de espera",

        // Contact extras
        "contact.responseTime": "Respuesta en 24 horas",
        "contact.whatsapp": "WhatsApp",

        // FAQ
        "faq.tag": "Preguntas frecuentes",
        "faq.title": "Preguntas frecuentes",
        "faq.subtitle": "Respuestas a las preguntas más comunes sobre formación y certificación SAP.",
        "faq.q1": "¿Qué son los cursos oficiales de certificación SAP?",
        "faq.a1": "Son cursos estandarizados autorizados por SAP Education que preparan para el examen oficial de certificación de consultor SAP. Ofrezco los Academy Tracks para MM (TS450/TS452) y SD (TS460/TS462).",
        "faq.q2": "¿Cómo se realizan las formaciones?",
        "faq.a2": "Todas las formaciones son 100% virtuales con práctica directa en un sistema SAP S/4HANA en vivo desde el primer día. Sin PowerPoint – aprendizaje System-First con procesos reales de extremo a extremo.",
        "faq.q3": "¿En qué idiomas se ofrecen las formaciones?",
        "faq.a3": "Todas las formaciones están disponibles en alemán, inglés y español. El idioma del curso puede adaptarse de manera flexible a las necesidades de su equipo.",
        "faq.q4": "¿Cuál es la tasa de aprobación en la certificación?",
        "faq.a4": "Mis participantes alcanzan una tasa de aprobación superior al 98%, con una valoración general del instructor de 1,08 (escala 1–6, 1 = Excelente). Basado en aprox. 250 participantes y más de 60 evaluaciones verificadas.",
        "faq.q5": "¿Ofrece formación corporativa a medida?",
        "faq.a5": "Sí, además de los cursos oficiales de certificación, ofrezco formación corporativa personalizada – adaptada a sus procesos, su configuración SAP y el nivel de experiencia de su equipo. Disponible en todo el mundo.",
        "faq.q6": "¿Cómo puedo reservar una formación?",
        "faq.a6": "Simplemente use el formulario de contacto, escriba a mario@mb-ics.com o llame al +1 954 836 9350. Respondo en 24 horas.",

        // Cookie Banner
        "cookie.text": "Utilizamos Google Analytics 4 para entender de dónde vienen nuestros visitantes — solo con su consentimiento. Hasta entonces, el tag funciona en modo consentimiento-denegado. Al reproducir videos se transmitirán datos a YouTube (Google). Las fuentes se alojan localmente. Para más información, consulte nuestra",
        "cookie.link": "Política de privacidad",
        "cookie.accept": "Aceptar todo",
        "cookie.necessary": "Solo necesarias",

        // Footer
        "footer.privacy": "Privacidad",
        "footer.impressum": "Aviso legal",
        "footer.cookieSettings": "Configuración de cookies",

        // Partners
        "partners.tag": "Para proveedores de formación",
        "partners.title": "Colaboración con proveedores de formación",
        "partners.subtitle": "Si operas una organización de formación que sirve a clientes SAP empresariales, trabajo como partner de entrega alineado al currículum.",
        "partners.card1title": "Currículum oficial SAP",
        "partners.card1desc": "Alineado con TS450 / TS452 (MM) hoy, TS460 / TS462 (SD) en expansión durante 2026.",
        "partners.card2title": "Internacional y trilingüe",
        "partners.card2desc": "Experiencia con cohortes de DACH, UE, Norteamérica y Latinoamérica — impartido en inglés, alemán y español.",
        "partners.card3title": "Frameworks comerciales",
        "partners.card3desc": "Familiarizado con Right-to-Represent, NDAs, sub-contracting y acuerdos de co-delivery.",
        "partners.card4title": "Flexibilidad de zonas horarias",
        "partners.card4desc": "Entrega regular en horarios US Eastern, CET y LATAM.",
        "partners.cta": "Enviar consulta de partner",

        // Resources
        "resources.tag": "Recursos para usuarios finales",
        "resources.text": "Para usuarios finales y reconvertidos — separado de mi trabajo de formación B2B — opero sapprep.de, una plataforma de aprendizaje self-service con contenido práctico basado en roles para compras, ventas, finanzas y almacén.",
        "resources.cta": "Visitar sapprep.de →",

        // Paths / Audience
        "paths.tag": "Tres audiencias",
        "paths.title": "A quién entreno",
        "paths.enterpriseBadge": "Oferta principal",
        "paths.enterpriseLabel": "Empresas · Equipos internos",
        "paths.enterpriseTitle": "Programas a medida",
        "paths.enterpriseDesc": "Formación MM a medida para equipos SAP internos — compras, inventario, verificación de facturas, customizing. Construida sobre tu configuración S/4HANA.",
        "paths.enterpriseCta": "Conversar sobre tu programa ↓",
        "paths.partnerBadge": "Partnership B2B",
        "paths.partnerLabel": "Proveedores de formación · Partners",
        "paths.partnerTitle": "Co-delivery alineado al currículum",
        "paths.partnerDesc": "Entrega white-label del currículum oficial SAP (TS450 / TS452, SD en expansión durante 2026). Right-to-Represent, cohortes internacionales, tres idiomas de entrega.",
        "paths.partnerCta": "Enviar consulta de partner ↓",
        "paths.enduserBadge": "Plataforma externa",
        "paths.enduserLabel": "Usuarios SAP · Reconvertidos",
        "paths.enduserTitle": "sapprep.de",
        "paths.enduserDesc": "Plataforma de aprendizaje self-service con contenido práctico basado en roles para compras, ventas, finanzas y almacén.",
        "paths.enduserCta": "Visitar sapprep.de →",

        // Blog
        "nav.blog": "Blog",
        "blog.tag": "Blog",
        "blog.title": "MM para consultores. Con perspectiva LATAM donde importa.",
        "blog.subtitle": "Conocimiento sólido de SAP MM para consultores y senior advisors — cada dos semanas, con una perspectiva internacional independiente sobre BR, MX, CO y los sectores de petróleo/gas y automoción.",
        "blog.filterAll": "Todos",
        "blog.filterLatam": "Con perspectiva LATAM",
        "blog.filterCore": "Solo MM core",
        "blog.readingTime": "min de lectura",
        "blog.minutes": "min",
        "blog.readPost": "Leer artículo →",
        "blog.relatedPosts": "Más artículos",
        "blog.tagLatam": "LATAM",
        "blog.tagCore": "MM-Core",
        "blog.tagWithLatam": "Con perspectiva LATAM",
        "blog.altLangAvailable": "Leer este artículo en alemán",
        "blog.breadcrumbHome": "Inicio",
        "blog.emptyTitle": "Los primeros artículos llegan pronto.",
        "blog.emptyBody": "El plan editorial está listo — cada dos semanas aparece un nuevo artículo. Conéctate en LinkedIn para no perderte ninguno.",
        "blog.linkedinCta": "Conectar en LinkedIn",
        "blog.sourcesTitle": "Fuentes",

        // Cross-Promo (Consultant-Training; secundario berater.sapprep.de — NO sapprep.de)
        "crossPromo.tag": "Mentoría TS452 personalizada",
        "crossPromo.title": "¿Te preparas tú mismo para TS452 y buscas un sparring real, no autoservicio?",
        "crossPromo.body": "Como SAP Certified Instructor (>98% de aprobación, valoración 1.08 de 6), ofrezco formaciones individuales para consultores MM — no un currículum estándar, sino adaptado a tus lagunas, tu sector y tu fecha de examen.",
        "crossPromo.ctaPrimary": "Solicitar formación para consultores",
        "crossPromo.ctaSecondary": "Conectar en LinkedIn",
        "crossPromo.hint": "Próximamente",
        "crossPromo.hintBody": "berater.sapprep.de — plataforma de autoestudio para TS452 con banco de preguntas, exámenes simulados y videos explicativos. En preparación.",

        // Disclaimer LATAM
        "disclaimer.latamTitle": "Aviso sobre contenido LATAM",
        "disclaimer.latamIntro": "Las normas fiscales y legales en Latinoamérica cambian con frecuencia. Estado de las afirmaciones:",
        "disclaimer.latamOutro": "Antes de aplicar algo en customizing productivo o en un rollout, verifica siempre el estado actual con la autoridad competente y en el SAP Help Portal. Este artículo no sustituye asesoramiento fiscal o legal."
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

    // Update aria-label attributes
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.dataset.i18nAria;
        if (translations[lang] && translations[lang][key]) {
            el.setAttribute('aria-label', translations[lang][key]);
        }
    });

    // Update visible form error messages on language switch
    document.querySelectorAll('.form-error.visible').forEach(el => {
        const key = el.getAttribute('data-i18n-error');
        if (key && translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    // Update active state on all lang buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Update Blog-Nav-Links: DE → /blog/de/, EN → /blog/en/, ES → /blog/en/ (Phase-1-Fallback)
    const blogLang = (lang === 'de') ? 'de' : 'en';
    document.querySelectorAll('[data-blog-link]').forEach(el => {
        el.setAttribute('href', '/blog/' + blogLang + '/');
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
