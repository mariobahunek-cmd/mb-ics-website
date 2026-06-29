// ═══════════════ TESTIMONIALS DATA & RENDERING ═══════════════
// Each testimonial: { name, initials, role (i18n key fallback), quote (i18n key fallback), source: 'linkedin'|'email'|'chat' }
// Quotes shown in original language; i18n translations in i18n.js

const testimonialData = [
    {
        name: "Sabrina B.",
        initials: "SB",
        role: { de: "SAP Foundation Teilnehmerin", en: "SAP Foundation Participant", es: "Participante SAP Foundation" },
        quote: {
            de: "Ich durfte 2026 gemeinsam mit Mario in den SAP Foundation Level Kurs starten – und das Jahr hat damit direkt einen echten Auftakt bekommen. Mario hat es geschafft, aus einer Gruppe schnell ein Team zu machen. Seine Art war offen, ehrlich und sehr angenehm, wodurch man sich von Anfang an wohlgefühlt hat. Gleichzeitig war sein Unterricht klar strukturiert, verständlich aufgebaut und fachlich auf einem sehr hohen Niveau. Besonders hilfreich waren seine Praxisbeispiele und das zusätzliche Hintergrundwissen, das weit über den reinen Lehrstoff hinausging. Ich kann Mario als SAP-Trainer zu 100% weiterempfehlen.",
            en: "In 2026 I had the pleasure of starting the SAP Foundation Level course with Mario – and the year got off to a great start. Mario managed to quickly turn a group into a team. His manner was open, honest and very pleasant, making you feel comfortable from the start. At the same time, his teaching was clearly structured, easy to follow and at a very high professional level. His practical examples and additional background knowledge that went far beyond the curriculum were especially helpful. I can recommend Mario as an SAP trainer 100%.",
            es: "En 2026 tuve el placer de comenzar el curso SAP Foundation Level con Mario – y el año empezó con buen pie. Mario logró convertir rápidamente un grupo en un equipo. Su trato fue abierto, honesto y muy agradable, lo que hizo que uno se sintiera cómodo desde el principio. Al mismo tiempo, sus clases estaban claramente estructuradas, eran fáciles de seguir y de un nivel profesional muy alto. Sus ejemplos prácticos y conocimientos adicionales que iban mucho más allá del temario fueron especialmente útiles. Recomiendo a Mario como formador SAP al 100%."
        },
        source: "linkedin"
    },
    {
        name: "Dirk S.",
        initials: "DS",
        role: { de: "SAP S/4HANA Foundation Teilnehmer", en: "SAP S/4HANA Foundation Participant", es: "Participante SAP S/4HANA Foundation" },
        quote: {
            de: "Ich habe die Weiterbildung \"SAP S/4HANA - Foundation Level, SAP-FL Zertifizierung\" mit Mario als Dozenten absolviert. Ich kann Mario ganz klar zu 100% weiterempfehlen. Herausragende Fachkompetenz! Mario konnte einem komplexe Themen, wie die neue Fiori-Oberfläche oder die HANA-Datenbankstruktur, anschaulich erklären. Die Übungen am System waren zielführend und gaben einen guten Einblick in die tägliche Arbeit mit S/4HANA. Absolut empfehlenswert für Einsteiger! Eine sehr gute Grundlage für weitere SAP-Fortbildungen.",
            en: "I completed the \"SAP S/4HANA - Foundation Level, SAP-FL Certification\" course with Mario as instructor. I can clearly recommend Mario 100%. Outstanding expertise! Mario was able to explain complex topics like the new Fiori interface or the HANA database structure in a vivid way. The hands-on exercises were purposeful and gave great insight into daily work with S/4HANA. Absolutely recommended for beginners! An excellent foundation for further SAP training.",
            es: "Completé la formación \"SAP S/4HANA - Foundation Level, Certificación SAP-FL\" con Mario como instructor. Puedo recomendar a Mario al 100% sin dudarlo. ¡Competencia profesional sobresaliente! Mario supo explicar temas complejos como la nueva interfaz Fiori o la estructura de base de datos HANA de manera ilustrativa. Los ejercicios prácticos en el sistema fueron efectivos y dieron una buena visión del trabajo diario con S/4HANA. ¡Absolutamente recomendable para principiantes!"
        },
        source: "linkedin"
    },
    {
        name: "Maximilian A.",
        initials: "MA",
        role: { de: "Shipping Industry Professional", en: "Shipping Industry Professional", es: "Profesional de la industria naviera" },
        quote: {
            de: "Er hat die seltene Fähigkeit, die Business-Perspektive mit der technischen Seite von SAP S/4HANA zu verbinden. Wir haben nicht nur Order-to-Cash und Purchase-to-Pay geübt – wir haben auch verstanden, wie diese Flüsse direkt die Buchhaltung beeinflussen. Ich kann ihn ohne Zögern empfehlen!",
            en: "He has a rare ability to connect the business perspective with the technical side of SAP S/4HANA. We didn't just practice Order-to-Cash and Purchase-to-Pay – we also understood how these flows directly affect accounting. I can recommend him without hesitation!",
            es: "Tiene una habilidad única para conectar la perspectiva empresarial con el lado técnico de SAP S/4HANA. No solo practicamos Order-to-Cash y Purchase-to-Pay – también entendimos cómo estos flujos afectan directamente la contabilidad. ¡Lo recomiendo sin dudar!"
        },
        source: "linkedin"
    },
    {
        name: "Dennis W.",
        initials: "DW",
        role: { de: "Maschinenbautechniker", en: "Manufacturing Engineer", es: "Ingeniero de manufactura" },
        quote: {
            de: "Mario bringt eine seltene Mischung aus Expertise, Klarheit und Praxisrelevanz ins SAP Training. Er lehrt nicht nur SAP – er befähigt dich, es mit Selbstvertrauen zu nutzen. Ich empfehle ihn jedem, der schnell aufsteigen möchte.",
            en: "Mario brings a rare mix of expertise, clarity, and real-world relevance to SAP training. He doesn't just teach SAP – he empowers you to use it with confidence. I'd recommend him to anyone looking to level up fast.",
            es: "Mario aporta una rara combinación de experiencia, claridad y relevancia práctica a la formación SAP. No solo enseña SAP – te capacita para usarlo con confianza. Lo recomendaría a cualquiera que quiera avanzar rápido."
        },
        source: "linkedin"
    },
    {
        name: "Acelya D.",
        initials: "AD",
        role: { de: "Büromanagerin", en: "Office Manager", es: "Gerente de oficina" },
        quote: {
            de: "Er verbindet Logistik und Finanzen so, dass alles Klick macht. Wenn du den Prozessfluss verstehen willst und was hinter den Kulissen in der Buchhaltung passiert, ist Mario der Trainer, den du brauchst.",
            en: "He connects the dots between logistics and finance in a way that makes everything click. If you want to understand the process flow and what happens behind the scenes in accounting, Mario is the trainer you want.",
            es: "Conecta logística y finanzas de una manera que hace que todo encaje. Si quieres entender el flujo de procesos y lo que pasa detrás de escena en contabilidad, Mario es el formador que necesitas."
        },
        source: "linkedin"
    },
    {
        name: "Jana N.",
        initials: "JN",
        role: { de: "Analytische Chemikerin", en: "Analytical Chemist", es: "Química analítica" },
        quote: {
            de: "Es war unheimlich interessant wie Sie uns SAP Themen beigebracht haben. Mit Ihrer Fachkompetenz konnten Sie jeden von uns überzeugen – auch für Einsteiger wie mich. Jedes Problem konnten Sie zügig lösen.",
            en: "It was incredibly interesting how you taught us SAP topics. With your expertise, you convinced every one of us – even beginners like me. Every problem was solved quickly and patiently.",
            es: "Fue increíblemente interesante cómo nos enseñó los temas de SAP. Con su competencia profesional convenció a cada uno de nosotros – incluso a principiantes como yo. Cada problema fue resuelto rápidamente."
        },
        source: "linkedin"
    },
    {
        name: "Līga V.",
        initials: "LV",
        role: { de: "HR & Global Mobility", en: "HR & Global Mobility", es: "RRHH y Movilidad Global" },
        quote: {
            de: "Mario hat ein echtes Talent: Er kann komplexe Inhalte von Grund auf verständlich und klar erklären, auch für Anfänger. Er ist nicht nur ein professioneller Dozent, sondern auch eine inspirierende Persönlichkeit.",
            en: "Mario has a real talent: He can explain complex content from the ground up in a clear and understandable way, even for beginners. He is not only a professional instructor, but also an inspiring personality.",
            es: "Mario tiene un verdadero talento: puede explicar contenidos complejos de forma comprensible y clara, incluso para principiantes. No es solo un instructor profesional, sino también una personalidad inspiradora."
        },
        source: "linkedin"
    },
    {
        name: "Rocío M.",
        initials: "RM",
        role: { de: "SAP S/4HANA Teilnehmerin", en: "SAP S/4HANA Participant", es: "Participante SAP S/4HANA" },
        quote: {
            de: "Einer der besten Professoren bei COMCAVE College. Mario war eine geduldige, freundliche und detailorientierte Person. Er spricht außerdem Spanisch, was mir half, jede Frage in meiner Sprache stellen zu können.",
            en: "One of the best professors at COMCAVE College. Mario was patient, friendly, and detail-oriented. He also speaks Spanish, which helped me feel comfortable asking questions in my own language.",
            es: "Uno de los mejores profesores de COMCAVE College. Mario fue una persona paciente, amigable y orientada a los detalles. Además habla español y me ayudó a sentirme que podía expresar cualquier duda en este idioma."
        },
        source: "linkedin"
    },
    {
        name: "Ellen L.",
        initials: "EL",
        role: { de: "Weiterbildung bei ComCave College", en: "Training at ComCave College", es: "Formación en ComCave College" },
        quote: {
            de: "Ich hatte das Vergnügen, an einem SAP-Kurs mit Mario teilzunehmen und ich kann mit voller Überzeugung sagen, dass er ein hervorragender Dozent ist. Seine tiefgehende Expertise im Bereich SAP, gepaart mit seiner Fähigkeit, komplexe Themen verständlich und praxisnah zu erklären, hat den Kurs für mich äußerst wertvoll gemacht.",
            en: "I had the pleasure of attending an SAP course with Mario and I can say with full conviction that he is an outstanding instructor. His deep expertise in SAP, combined with his ability to explain complex topics clearly and practically, made the course extremely valuable for me.",
            es: "Tuve el placer de asistir a un curso de SAP con Mario y puedo decir con total convicción que es un instructor excepcional. Su profunda experiencia en SAP, combinada con su capacidad para explicar temas complejos de forma clara y práctica, hizo que el curso fuera extremadamente valioso para mí."
        },
        source: "linkedin"
    },
    {
        name: "Ralf B.",
        initials: "RB",
        role: { de: "In Weiterbildung", en: "In Further Education", es: "En formación continua" },
        quote: {
            de: "Mario ist ein ausgezeichneter Trainer, der es versteht, SAP-Wissen nicht nur zu vermitteln, sondern auch Begeisterung zu wecken. Seine klaren Erklärungen, die praxisnahen Übungen und seine positive Art haben mich überzeugt. Vielen Dank für diesen hochwertigen Kurs!",
            en: "Mario is an excellent trainer who knows how to not only impart SAP knowledge but also spark enthusiasm. His clear explanations, practical exercises, and positive attitude convinced me. Thank you for this high-quality course!",
            es: "Mario es un excelente formador que sabe no solo transmitir conocimientos de SAP sino también despertar entusiasmo. Sus explicaciones claras, ejercicios prácticos y actitud positiva me convencieron. ¡Gracias por este curso de alta calidad!"
        },
        source: "linkedin"
    },
    {
        name: "Oliver M.",
        initials: "OM",
        role: { de: "Unternehmer", en: "Entrepreneur", es: "Empresario" },
        quote: {
            de: "Mario Bahunek ist ein äußerst engagierter Trainer, der mit seiner Geduld und Aufgeschlossenheit überzeugt. Er schafft eine motivierende Lernatmosphäre, in der jede Frage willkommen ist und niemand zurückgelassen wird. Seine Fähigkeit, komplexe Inhalte verständlich zu vermitteln, macht das Lernen nicht nur effektiv, sondern auch angenehm.",
            en: "Mario Bahunek is a highly dedicated trainer who convinces with his patience and openness. He creates a motivating learning atmosphere where every question is welcome and nobody is left behind. His ability to convey complex content in an understandable way makes learning not only effective but also enjoyable.",
            es: "Mario Bahunek es un formador altamente dedicado que convence con su paciencia y apertura. Crea una atmósfera de aprendizaje motivadora donde cada pregunta es bienvenida y nadie se queda atrás."
        },
        source: "linkedin"
    },
    {
        name: "Eleonora M.",
        initials: "EM",
        role: { de: "Management Excellence", en: "Management Excellence", es: "Excelencia en Gestión" },
        quote: {
            de: "Mario hat den SAP-SD-Kurs sehr übersichtlich, strukturiert und mit großer Geduld geleitet. Er hat selbst schwierige Themen einfach und nachvollziehbar erklärt und keine Frage unbeantwortet gelassen. Der Kurs hat mir viel Wissen vermittelt, und ich fühle mich nun sicherer im Umgang mit SAP.",
            en: "Mario led the SAP SD course very clearly, structured, and with great patience. He explained even difficult topics simply and comprehensibly, leaving no question unanswered. The course taught me a lot, and I now feel more confident working with SAP.",
            es: "Mario dirigió el curso de SAP SD de manera muy clara, estructurada y con gran paciencia. Explicó incluso los temas difíciles de forma simple y comprensible, sin dejar ninguna pregunta sin respuesta."
        },
        source: "linkedin"
    },
    {
        name: "Monika J.",
        initials: "MJ",
        role: { de: "SAP Kursteilnehmerin", en: "SAP Course Participant", es: "Participante de curso SAP" },
        quote: {
            de: "Noch besser hätte es mich nicht treffen können, dich als Dozenten haben zu dürfen. DANKE für deine Geduld, DANKE für deine Empathie und DANKE, dass es Menschen wie dich noch gibt.",
            en: "I couldn't have been luckier to have you as an instructor. THANK YOU for your patience, THANK YOU for your empathy, and THANK YOU that people like you still exist.",
            es: "No podría haber tenido más suerte de tenerte como instructor. GRACIAS por tu paciencia, GRACIAS por tu empatía y GRACIAS porque personas como tú aún existen."
        },
        source: "linkedin"
    },
    {
        name: "Somayeh K.",
        initials: "SK",
        role: { de: "Financial Analyst / Data Analyst", en: "Financial Analyst / Data Analyst", es: "Analista financiera / de datos" },
        quote: {
            de: "Du hast es geschafft, selbst komplexe Themen verständlich und praxisnah zu vermitteln, sodass ich das Gelernte sofort in meiner Arbeit anwenden konnte. Deine geduldige Art und deine umfassende Fachkenntnis haben den Kurs wirklich bereichert.",
            en: "You managed to convey even complex topics in an understandable and practical way, so I could immediately apply what I learned in my work. Your patient manner and comprehensive expertise truly enriched the course.",
            es: "Lograste transmitir incluso temas complejos de manera comprensible y práctica, para que pudiera aplicar inmediatamente lo aprendido en mi trabajo."
        },
        source: "linkedin"
    },
    {
        name: "Roberta R.",
        initials: "RR",
        role: { de: "Sprachwissenschaftlerin", en: "Linguist", es: "Lingüista" },
        quote: {
            de: "Ich habe mich gefreut, an deinem Kurs zum SAP S/4HANA Zertifizierung Level teilzunehmen. Du warst ein sehr kompetenter Lehrer, immer für die Fragen der Teilnehmer erreichbar und immer freundlich. Auch diese Freundlichkeit ist eine Qualität, die nicht jeder hat.",
            en: "I was happy to participate in your SAP S/4HANA certification course. You were a very competent teacher, always available for participants' questions and always friendly. This friendliness is a quality not everyone has.",
            es: "Me alegré de participar en tu curso de certificación SAP S/4HANA. Fuiste un profesor muy competente, siempre disponible para las preguntas de los participantes y siempre amable."
        },
        source: "linkedin"
    },
    {
        name: "Stephan C.",
        initials: "SC",
        role: { de: "SAP SD Kursteilnehmer", en: "SAP SD Course Participant", es: "Participante curso SAP SD" },
        quote: {
            de: "Der SAP SD Kurs bei dir war absolut herausragend! Deine Fähigkeit, selbst komplexe Inhalte verständlich und praxisnah zu erklären, hat mich wirklich beeindruckt. Du schaffst es, nicht nur Wissen zu vermitteln, sondern auch Begeisterung für SAP SD zu wecken.",
            en: "The SAP SD course with you was absolutely outstanding! Your ability to explain even complex content in an understandable and practical way really impressed me. You manage not only to impart knowledge but also to spark enthusiasm for SAP SD.",
            es: "¡El curso de SAP SD contigo fue absolutamente sobresaliente! Tu capacidad para explicar contenidos complejos de forma comprensible y práctica realmente me impresionó."
        },
        source: "email"
    },
    {
        name: "Christopher V.",
        initials: "CV",
        role: { de: "SAP Kursteilnehmer", en: "SAP Course Participant", es: "Participante de curso SAP" },
        quote: {
            de: "Ich bin auch super zufrieden mit Herrn Bahunek. Er hat ein Gespür dafür Wissen zu vermitteln, hat eine unglaublich positive und ruhige Ausstrahlung. Er geht auf Fragen ein und ist stets geduldig. Hatte jetzt schon einige Kurse und könnte mir keinen besseren Dozenten wünschen.",
            en: "I'm super satisfied with Mr. Bahunek. He has a gift for imparting knowledge, an incredibly positive and calm presence. He responds to questions and is always patient. I've had several courses now and couldn't wish for a better instructor.",
            es: "Estoy súper satisfecho con el Sr. Bahunek. Tiene un don para transmitir conocimiento, una presencia increíblemente positiva y calmada. Responde a las preguntas y siempre es paciente."
        },
        source: "chat"
    },
    {
        name: "Nadine S.",
        initials: "NS",
        role: { de: "SAP Foundation Teilnehmerin", en: "SAP Foundation Participant", es: "Participante SAP Foundation" },
        quote: {
            de: "Ich bedanke mich sehr für den SAP Foundation Level Kurs, für Deine Geduld und den interaktiv gestalteten und praxisnahen Unterricht. Selbst komplexe Themen konntest Du mit viel Freude und Engagement sehr verständlich vermitteln.",
            en: "Thank you so much for the SAP Foundation Level course, for your patience and the interactive, practical teaching. You were able to convey even complex topics with great joy and commitment in a very understandable way.",
            es: "Muchas gracias por el curso SAP Foundation Level, por tu paciencia y la enseñanza interactiva y práctica. Pudiste transmitir incluso temas complejos con gran alegría y compromiso de manera muy comprensible."
        },
        source: "email"
    },
    {
        name: "Razvan P.",
        initials: "RP",
        role: { de: "SAP Foundation Teilnehmer", en: "SAP Foundation Participant", es: "Participante SAP Foundation" },
        quote: {
            de: "Ich bin froh, dass ich die Gelegenheit hatte, vom besten Lehrer der Branche zu lernen. Dein Art, diesen Kurs zu unterrichten, macht Lust aufs Lernen, denn ohne deine Fähigkeiten hätte ich nicht die Prüfung bestanden. Ein guter Lehrer ist wie eine Kerze – sie verzehrt sich selbst, um anderen den Weg zu erleuchten.",
            en: "I'm glad I had the opportunity to learn from the best teacher in the industry. Your way of teaching this course makes you want to learn, because without your skills I wouldn't have passed the exam. A good teacher is like a candle – it consumes itself to light the way for others.",
            es: "Me alegro de haber tenido la oportunidad de aprender del mejor profesor de la industria. Tu forma de enseñar este curso da ganas de aprender, porque sin tus habilidades no habría aprobado el examen."
        },
        source: "email"
    },
    {
        name: "Sarah M.",
        initials: "SM",
        role: { de: "SAP S/4HANA Teilnehmerin", en: "SAP S/4HANA Participant", es: "Participante SAP S/4HANA" },
        quote: {
            de: "Mario hat sich immer Zeit genommen, hat mit sehr guten Beispielen auch wirklich Systemfremden alles nahebringen können, hat jede Frage anschaulich beantwortet. Sein Unterricht war frisch, motivierend, humorvoll, wertschätzend und super erfolgreich.",
            en: "Mario always took the time, used excellent examples to bring everything close to those unfamiliar with the system, and answered every question vividly. His teaching was fresh, motivating, humorous, appreciative and super successful.",
            es: "Mario siempre se tomó el tiempo, utilizó excelentes ejemplos para acercar todo a quienes no conocían el sistema y respondió cada pregunta de manera clara."
        },
        source: "email"
    },
    {
        name: "Ali D.",
        initials: "AD2",
        role: { de: "SAP Foundation Teilnehmer", en: "SAP Foundation Participant", es: "Participante SAP Foundation" },
        quote: {
            de: "Du bist eine der besten Dozenten, die ich kennen gelernt habe. Deine fachliche Kompetenz und zwischenmenschliche angenehme Umgangsformen, die Geduld die du uns entgegengebracht hast, sind die beste Art die sich eine Studenten nur wünschen könnten.",
            en: "You are one of the best instructors I have ever met. Your professional competence, pleasant interpersonal skills, and the patience you showed us are the best a student could wish for.",
            es: "Eres uno de los mejores instructores que he conocido. Tu competencia profesional, tus agradables habilidades interpersonales y la paciencia que nos mostraste son lo mejor que un estudiante podría desear."
        },
        source: "email"
    },
    {
        name: "Shahab S.",
        initials: "SS",
        role: { de: "SAP Kursteilnehmer, Hamburg", en: "SAP Course Participant, Hamburg", es: "Participante SAP, Hamburgo" },
        quote: {
            de: "Mario bringt nicht nur umfangreiche Fachkenntnisse mit, sondern vermittelt diese auch auf eine äußerst engagierte und verständliche Weise. Besonders beeindruckt hat mich Marios Fähigkeit, den Unterricht lebendig zu gestalten. Ich empfehle Mario Bahunek ohne Vorbehalte weiter.",
            en: "Mario not only brings extensive expertise but also conveys it in an extremely engaged and understandable way. I was particularly impressed by Mario's ability to make lessons come alive. I recommend Mario Bahunek without reservation.",
            es: "Mario no solo aporta amplia experiencia sino que la transmite de manera extremadamente comprometida y comprensible. Me impresionó especialmente la capacidad de Mario para hacer las clases dinámicas."
        },
        source: "email"
    },
    {
        name: "Helena S.",
        initials: "HS",
        role: { de: "SAP Kursteilnehmerin", en: "SAP Course Participant", es: "Participante de curso SAP" },
        quote: {
            de: "Ich möchte mich herzlich bei dir für den lehrreichen SAP-Kurs bedanken. Deine positive Einstellung und Fähigkeiten zu motivieren haben den Kurs wirklich bereichert. Mario, du hast eine angenehme Lernatmosphäre geschaffen und den Unterricht interessant und praxisnah gestaltet.",
            en: "I would like to sincerely thank you for the educational SAP course. Your positive attitude and ability to motivate truly enriched the course. Mario, you created a pleasant learning atmosphere and made the lessons interesting and practical.",
            es: "Me gustaría agradecerte sinceramente por el curso educativo de SAP. Tu actitud positiva y tu capacidad para motivar realmente enriquecieron el curso."
        },
        source: "email"
    },
    {
        name: "Banyoudeh S.",
        initials: "BS",
        role: { de: "Scrum-Kursteilnehmer", en: "Scrum Course Participant", es: "Participante curso Scrum" },
        quote: {
            de: "Deine Pünktlichkeit, deine positive Einstellung und deine Fähigkeit, uns durchgehend zu motivieren, haben den Kurs wirklich bereichert. Du hast es geschafft, uns nicht nur die Lehrinhalte verständlich zu vermitteln, sondern auch praktische Erfahrungen einfließen zu lassen.",
            en: "Your punctuality, positive attitude, and ability to continuously motivate us truly enriched the course. You managed not only to convey the teaching content in an understandable way but also to incorporate practical experience.",
            es: "Tu puntualidad, actitud positiva y capacidad para motivarnos continuamente realmente enriquecieron el curso."
        },
        source: "email"
    },
    {
        name: "Dirk F.",
        initials: "DF",
        role: { de: "SAP Foundation Teilnehmer", en: "SAP Foundation Participant", es: "Participante SAP Foundation" },
        quote: {
            de: "Ich möchte mich für den tollen Unterricht und die optimale Vorbereitung für die SAP-FL-Zertifizierung bedanken! Du hast den Unterricht sehr gut geleitet – in einem Tempo, bei dem kein Schüler zurückgelassen wurde. Besonders hat mich gefreut, wie du einen eher trockenen Stoff mit deiner sympathischen Art und mit spielerischen Elementen wie z.B. das Kahoot-Quiz sehr kurzweilig vermittelt hast. Nicht zuletzt war es aber vor allem dein Online-Tool mit deinen selbst erstellten SAP-Fragenkatalogen, das es uns Schülern leicht gemacht hat, die SAP-Prüfung zu bestehen.",
            en: "I want to thank you for the great teaching and optimal preparation for the SAP FL certification! You led the class at a pace where no student was left behind. I especially appreciated how you made dry material engaging with your friendly manner and playful elements like Kahoot quizzes. Most importantly, your online tool with self-created SAP question banks made it easy for us students to pass the SAP exam.",
            es: "Quiero agradecerte por la excelente enseñanza y la preparación óptima para la certificación SAP FL. Dirigiste la clase a un ritmo donde ningún alumno se quedó atrás. Especialmente aprecié cómo hiciste el contenido seco interesante con tu manera amable y elementos lúdicos como los quizzes de Kahoot."
        },
        source: "email"
    },
    {
        name: "Dilan K.",
        initials: "DK",
        role: { de: "SAP FI Teilnehmerin – 97%", en: "SAP FI Participant – 97%", es: "Participante SAP FI – 97%" },
        quote: {
            de: "Dank Marios Vorbereitung und dem Online-Tool habe ich die FI-Prüfung mit 97% bestanden! Die Übungsfragen waren perfekt auf die echte Prüfung abgestimmt.",
            en: "Thanks to Mario's preparation and the online tool, I passed the FI exam with 97%! The practice questions were perfectly aligned with the real exam.",
            es: "Gracias a la preparación de Mario y la herramienta online, aprobé el examen FI con 97%. Las preguntas de práctica estaban perfectamente alineadas con el examen real."
        },
        source: "email"
    },
    {
        name: "Ying S.",
        initials: "YS",
        role: { de: "SAP Foundation – 87%, Auszeichnung", en: "SAP Foundation – 87%, With Distinction", es: "SAP Foundation – 87%, Con Distinción" },
        quote: {
            de: "Mit dem Online-Tool von Mario habe ich die SAP Foundation Prüfung mit 87% und Auszeichnung bestanden! Die Mischung aus Lern- und Prüfungsmodus hat mir geholfen, mich gezielt vorzubereiten.",
            en: "With Mario's online tool, I passed the SAP Foundation exam with 87% and distinction! The mix of learning and exam modes helped me prepare in a targeted way.",
            es: "Con la herramienta online de Mario, aprobé el examen SAP Foundation con 87% y distinción. La combinación de modo de aprendizaje y examen me ayudó a prepararme de manera específica."
        },
        source: "email"
    },
    {
        name: "Alexandra K.",
        initials: "AK",
        role: { de: "SAP Foundation – Auszeichnung", en: "SAP Foundation – With Distinction", es: "SAP Foundation – Con Distinción" },
        quote: {
            de: "Die Probeklausuren auf zertprep.de waren der Schlüssel zu meinem Erfolg. Ich habe die Foundation-Prüfung mit Auszeichnung bestanden! Kann ich nur weiterempfehlen.",
            en: "The practice exams on zertprep.de were the key to my success. I passed the Foundation exam with distinction! Highly recommended.",
            es: "Los exámenes de práctica en zertprep.de fueron la clave de mi éxito. Aprobé el examen Foundation con distinción. ¡Muy recomendable!"
        },
        source: "email"
    },
    {
        name: "Bogdan Z.",
        initials: "BZ",
        role: { de: "SAP Foundation Teilnehmer – 80%", en: "SAP Foundation Participant – 80%", es: "Participante SAP Foundation – 80%" },
        quote: {
            de: "Das Online-Tool hat mir sehr geholfen bei der Vorbereitung. 80% in der Foundation-Prüfung – ohne das Tool wäre das nicht möglich gewesen.",
            en: "The online tool helped me a lot with preparation. 80% on the Foundation exam – without the tool that wouldn't have been possible.",
            es: "La herramienta online me ayudó mucho con la preparación. 80% en el examen Foundation – sin la herramienta no habría sido posible."
        },
        source: "email"
    },
    {
        name: "Yanfang E.",
        initials: "YE",
        role: { de: "SAP Kursteilnehmerin", en: "SAP Course Participant", es: "Participante de curso SAP" },
        quote: {
            de: "Ich finde Herrn Bahnuek ist super, gute Wissen und geduldig. Ich bin sehr zu frieden.",
            en: "I think Mr. Bahunek is great, good knowledge and patient. I am very satisfied.",
            es: "Creo que el Sr. Bahunek es genial, buen conocimiento y paciente. Estoy muy satisfecha."
        },
        source: "chat"
    }
];

// ═══════ RENDERING ═══════
const BATCH_SIZE = 6;
let currentIndex = 0;

const linkedinSvg = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M13.33 6.67a5 5 0 015 5v5.83h-3.33v-5.83a1.67 1.67 0 00-3.33 0v5.83H8.33V6.67h3.34v.83a5 5 0 011.66-.83zM1.67 7.5h3.33v10H1.67zM3.33 5a1.67 1.67 0 100-3.33 1.67 1.67 0 000 3.33z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function getSourceIcon(source) {
    if (source === 'linkedin') return linkedinSvg;
    if (source === 'email') return '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3.33 3.33h13.34c.92 0 1.66.75 1.66 1.67v10c0 .92-.74 1.67-1.66 1.67H3.33c-.92 0-1.66-.75-1.66-1.67V5c0-.92.74-1.67 1.66-1.67z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.33 5l-8.33 5.83L1.67 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (source === 'chat') return '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M17.5 12.5a1.67 1.67 0 01-1.67 1.67h-10L2.5 17.5V4.17A1.67 1.67 0 014.17 2.5h11.66A1.67 1.67 0 0117.5 4.17v8.33z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '';
}

function getCurrentLang() {
    return document.documentElement.getAttribute('data-lang') || 'de';
}

function createTestimonialCard(t, index) {
    const lang = getCurrentLang();
    const quote = t.quote[lang] || t.quote.de;
    const role = t.role[lang] || t.role.de;
    const initials = t.initials.replace(/\d/g, ''); // Remove trailing numbers like AD2

    const card = document.createElement('div');
    card.className = 'testimonial-card';

    // Respect reduced motion preference
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reducedMotion) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
    }

    card.innerHTML = `
        <div class="testimonial-card__quote">
            <p>\u201C${quote}\u201D</p>
        </div>
        <div class="testimonial-card__author">
            <div class="testimonial-card__avatar">${initials}</div>
            <div class="testimonial-card__info">
                <strong>${t.name}</strong>
                <span>${role}</span>
            </div>
            <span class="testimonial-card__source" title="${t.source}">${getSourceIcon(t.source)}</span>
        </div>
    `;

    // Stagger animation (skip if reduced motion)
    if (!reducedMotion) {
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, (index % BATCH_SIZE) * 100);
    }

    return card;
}

function loadMoreTestimonials() {
    const grid = document.getElementById('testimonialsGrid');
    const btn = document.getElementById('loadMoreBtn');
    if (!grid || !btn) return;

    const end = Math.min(currentIndex + BATCH_SIZE, testimonialData.length);

    for (let i = currentIndex; i < end; i++) {
        grid.appendChild(createTestimonialCard(testimonialData[i], i));
    }

    currentIndex = end;

    // Update button text with count
    if (currentIndex >= testimonialData.length) {
        btn.style.display = 'none';
    } else {
        const remaining = testimonialData.length - currentIndex;
        const lang = getCurrentLang();
        const labels = {
            de: `Mehr laden (${remaining} weitere)`,
            en: `Load more (${remaining} remaining)`,
            es: `Cargar más (${remaining} restantes)`
        };
        btn.textContent = labels[lang] || labels.de;
    }
}

// Re-render all visible cards when language changes (called from i18n.js)
function refreshTestimonialLanguage() {
    const grid = document.getElementById('testimonialsGrid');
    const btn = document.getElementById('loadMoreBtn');
    if (!grid) return;

    grid.innerHTML = '';
    const visibleCount = currentIndex;
    currentIndex = 0;

    const end = Math.min(visibleCount, testimonialData.length);
    for (let i = 0; i < end; i++) {
        const card = createTestimonialCard(testimonialData[i], i);
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
        grid.appendChild(card);
    }
    currentIndex = end;

    if (btn) {
        if (currentIndex >= testimonialData.length) {
            btn.style.display = 'none';
        } else {
            btn.style.display = '';
            const remaining = testimonialData.length - currentIndex;
            const lang = getCurrentLang();
            const labels = {
                de: `Mehr laden (${remaining} weitere)`,
                en: `Load more (${remaining} remaining)`,
                es: `Cargar más (${remaining} restantes)`
            };
            btn.textContent = labels[lang] || labels.de;
        }
    }
}

// Init – detect SSR pre-rendered cards
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('testimonialsGrid');
    const existingCards = grid ? grid.querySelectorAll('.testimonial-card') : [];

    if (existingCards.length > 0) {
        // SSR: cards already in HTML, skip initial render
        currentIndex = existingCards.length;
    } else {
        // No SSR fallback: render first batch via JS
        loadMoreTestimonials();
    }

    document.getElementById('loadMoreBtn')?.addEventListener('click', loadMoreTestimonials);
});
