# SAP MM Crash Course Landing Page

Coming-Soon-Page für den 3-Tage-Live-Online-Crashkurs zur Vorbereitung auf
das neue **C_TS452_2601** (System-Based Exam, SAP Sourcing & Procurement).

## Wo liegt was

| Pfad | Zweck |
|---|---|
| `/sap-mm-crashcourse/index.html` | Die Page. Statisches HTML mit Tailwind-CDN, kein Jekyll-Layout. |
| `/sitemap.xml` | Enthält die URL. |

Live: `https://mb-ics.com/sap-mm-crashcourse/`

## Curriculum-Alignment mit SAP Learning Hub

Day-1/2/3-Outline ist auf die offiziellen SAP-Academy-Module gemapped, die
hinter dem TS452-Curriculum stehen. Quelle: Marios eigene Trainings-Materialien
(`Schulungsunterlagen/SAP/SAP MM/Berater/Excercise material Learning HUB`).

| Day | Themen | SAP-Module |
|---|---|---|
| 1 | Procurement Foundation + Master Data | S4500, S4520 (Master Data Unit), S4550 (Valuation) |
| 2 | Advanced Purchasing, Sources of Supply, MRP | S4520, S45250 |
| 3 | Inventory, Invoice Verification, Exam Strategy | S4510, S4515 + Closing |

Gesamt-Volumen der offiziellen Module: ca. **187 Übungen über ~54 Stunden**.
Crashkurs komprimiert das auf 3 Tage à ~4h Live-Session — Fokus auf
Konfigurations-Muster und typische Exam-Aufgaben-Typen, nicht jede Einzel-Übung.

Vorteil für Authority-Positionierung: Mario lehrt die gleichen Module ohnehin
bei seinen Corporate-Clients — der Crashkurs ist die kondensierte Variante,
nicht ein Lehrstoff den er extra zusammenbaut.

## Strategischer Frame

- **Zielgruppe**: englischsprachige USA/LATAM-Berater (DACH bewusst NICHT Default).
- **Mode**: Coming Soon. Kein Buy-Button, kein Datum. Email-Capture sammelt
  Frühinteresse; erste Cohort startet, wenn die Liste eine workable size
  erreicht hat (~8 Teilnehmer).
- **Authority-Frame**: Mario als SAP Certified Instructor (250+ trained,
  98%+ pass rate, EN/DE/ES), basiert auf Marios tatsächlichem Track-Record
  aus dem mb-ics-Memory — keine erfundenen Zahlen, keine erfundenen
  Testimonials, kein Konkurrenz-Bashing.
- **Preis**: vorläufig "from USD 499", explizit als preliminary markiert.
- **Zeitfenster**: U.S./LATAM-friendly hours (10am–2pm EST). Europa über
  Recordings.

## Wichtige Regeln, die hier eingehalten sind

- Keine kategorischen Aussagen über andere Anbieter ("dumps useless",
  "named providers still optimized for MCQ" etc.) — alle solchen Formulierungen
  aus der alten Vorlage sind entfernt.
- Faktenaussagen zum neuen Exam-Format sind mit offiziellen SAP-Quellen
  verlinkt (learning.sap.com FAQ, SAP Community Roll-out-Blog).
- Pass-Rate und Teilnehmer-Zahl stammen aus Marios verifiziertem
  Track-Record (`memory/project_mb_ics.md`), nicht erfunden.
- Keine spezifischen Exam-Specs (Dauer, Anzahl Tasks, Topic-Weights)
  hartcodiert, weil die Drittquellen widersprüchlich sind und die offizielle
  SAP-Detailseite JS-rendered — die Page verweist auf "official SAP
  certification page" statt selbst zu spezifizieren.

## Email-Provider: Brevo

Wie bei der zurückgezogenen Workshop-Page. Setup analog:

1. Brevo Dashboard → Contacts → Forms → Create form.
2. Felder: `EMAIL`, `FIRSTNAME`, `COUNTRY`, `ROLE` (Custom: `consultant-employed`,
   `consultant-freelance`, `career-switcher`, `other`), `SOURCE` (Custom,
   alle Leads von dieser Page haben `sap-mm-crashcourse-landing`).
3. Double-Opt-in aktivieren.
4. Auto-Responder: "Thanks for signing up — first cohort details follow soon".
   PDF/Material ist NICHT vorgesehen (anders als beim alten Lead-Magnet),
   weil dies eine reine Notify-Liste ist.
5. Form-Action-URL kopieren (Format `https://sibforms.com/serve/...`) und in
   `sap-mm-crashcourse/index.html` als `BREVO_FORM_URL` einsetzen.

## TODOs vor Launch (für Mario)

1. **Brevo-Endpoint** setzen (`BREVO_FORM_URL` in der HTML-Datei).
2. **OG-Image** als `sap-mm-crashcourse/og-image.jpg` (1200×630).
3. Optional: Logo/Favicon-Variante (nutzt aktuell das Hauptsite-Favicon).
4. Beim Cohort-Launch: Page-Modus umstellen von "Coming Soon" → "Cohort open"
   mit Buy-Button (Lemon Squeezy / Stripe Checkout — Format folgt).

## Was bewusst NICHT auf der Page steht

- Konkretes Cohort-Datum (gibt's noch keins).
- "I just sat the exam" o.ä. (Frame ist Trainer, nicht Exam-Absolvent).
- Konkurrenten-Bashing.
- Testimonials/Bewertungen (gibt's für diese spezifische Cohort noch nicht).
- Pricing-Tabelle (Mini-Workshop / Cohort / Premium) — nur eine Preis-Linie,
  alles andere verwirrt im Coming-Soon-Modus.

## Ableitung weiterer Module (FI/SD/EWM)

Identisches Pattern, Copy von `sap-mm-crashcourse/` nach z. B.
`sap-sd-crashcourse/`:
- Exam-Code anpassen (z. B. C_TS462_2601 für SD).
- MM → SD im Markup, procurement → sales im Body.
- `SOURCE`-Wert in der Form ändern (eigene Brevo-Form).
- Sitemap erweitern.
- Course-Outline-Themen für das neue Modul anpassen.
