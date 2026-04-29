# Mario-Final-Review — Post 001

**Slot:** 01 / Bewertungsklassen + Kontenfindung
**Stand der Pipeline:** Stufe 1-4 abgeschlossen, in `_drafts/`
**Dein Aufwand:** ~5 Min nach REVIEW_PIPELINE.md

---

## Files

- DE: [`_drafts/2026-04-28-bewertungsklassen-kontenfindung-de.md`](../_drafts/2026-04-28-bewertungsklassen-kontenfindung-de.md) — 1.500 Wörter (ohne Frontmatter), 9 Min Lesezeit
- EN: [`_drafts/2026-04-28-bewertungsklassen-kontenfindung-en.md`](../_drafts/2026-04-28-bewertungsklassen-kontenfindung-en.md) — Adaption (nicht 1:1-Übersetzung), Multi-Country-Frame statt DACH-Frame im LATAM-Block

Beide Files sind über `translation_key: post-001-bewertungsklassen` verbunden — Layout zieht daraus Hreflang + Lang-Switcher automatisch.

---

## Status: freigabereif (0 offene Markups)

- Quellen-Liste in beiden Drafts auf 0 `[QUELLE FEHLT]`-Markups gebracht (generische SAP-Help/SAP-for-Me-Verweise mit Such-Hinweisen, keine erfundenen Pfade).
- Stilstelle „echt unangenehme Aktion" / „genuinely painful" durch „im Produktivsystem aufwendige Aktion" / „a costly operation in production" ersetzt.
- GitHub-Action erweitert: synchronisiert beim Move auch das Frontmatter-`date:` mit dem Filename-Datum.

## LATAM-Behauptungen + Quellen-Status

Konzept des LATAM-Blocks: rein analytisch, **keine** First-Person-Cases. Alle Aussagen formuliert als „SAP Localization sieht vor, dass…" / „BR-Setups erfordern…", nicht als „Ich habe in BR…".

| # | Behauptung | Quelle / Status |
|---|-----------|-----------------|
| 1 | ICMS und IPI sind teilweise erstattungsfähig (kein reiner FI-Buchungssatz) | Public Knowledge zu BR-VAT-System (verbreitet dokumentiert), zusätzlich SAP Help Portal Localization Brazil. URL fehlt — bitte im Mario-Final exakten Pfad einsetzen. |
| 2 | TAXBRA ist das zentrale Steuerschema in BR-Localization | SAP-Standard-Dokumentation, T-Code OBQ1/OBYZ. Generischer Verweis im Quellen-Block. |
| 3 | Localization fügt zusätzliche Vorgänge zu OBYC hinzu (für ICMS/IPI/PIS/COFINS) | SAP Help Portal Localization Brazil. **[QUELLE FEHLT]** — exakter Pfad bzw. SAP-Note-Nummer einzusetzen. |
| 4 | NCM-Code (Nomenclatura Comum do Mercosul) am Material erforderlich | Allgemein bekannt im BR-SAP-Kontext, dokumentiert in SAP Help. Generisch belegbar. |
| 5 | CFOP-Logik treibt Steuersituation des Lieferanten | SAP Localization Brazil — generisch belegbar. |
| 6 | NF-e/SEFAZ-Auswirkung bei misslungener Konten-Findung | Konsequent-logisch (NF-e wird aus den Steuerbeträgen erzeugt), keine direkte Quelle nötig. |

**Konkrete Quellen-Markups in den Drafts:**
- 2× `[QUELLE FEHLT]` im DE-Draft (sources-Frontmatter, SAP Help Portal exakter Pfad + SAP-Note-Nummer)
- 2× analoge `[SOURCE MISSING]` im EN-Draft

→ **Pipeline-Logik:** Per REVIEW_PIPELINE.md sind 1-3 Markups „Revision zurück an Stufe 1". Ich habe das bewusst nicht selbst entschieden, weil die Markups *ergänzbar* (URL einsetzen) und nicht *Aussagen-gefährdend* sind. Wenn du die SAP-Help-URL und/oder SAP-Note-Nummer parat hast, einsetzen — Post ist publikationsreif. Falls du die nicht parat hast und keine Lust hast zu suchen, sag Bescheid: ich kann den LATAM-Block auch generischer formulieren (ohne konkrete Note-Referenzen) und damit auf 0 Markups bringen.

---

## Stil-Review-Stopps (Stufe 3)

Roter-Flag-Liste durchgegangen — **kein Treffer**:

- [x] Keine „Ich habe in [LATAM-Land]…"-Behauptungen
- [x] Keine „Bei meinem Kunden in [LATAM-Land]…"
- [x] Keine „Aus meiner Erfahrung in [LATAM-Land]…"
- [x] Keine Hype-Phrasen ohne Beleg

LATAM-Block ist analytisch formuliert: „Standard-OBYC liefert Hooks dafür über zusätzliche Vorgänge…" / „Localization-Logik löst die finalen Konten auf…". Kein Praktiker-Tönen.

Persona-C-Tonalität: nüchtern, mit konkreten Beispielen, ohne Buzzword-Bingo. Hook im ersten Absatz greift Tickets-aus-dem-Finance auf — direkt aus Berater-Alltag.

Eine Stilstelle, an der du final entscheiden solltest:
- DE „echt unangenehme Aktion" (Bewertungsklassen-Umstellung im Live) — etwas umgangssprachlich. Falls du das raus willst: sag „aufwendige Aktion mit Bestand-, Wert- und Buchungsbeleg-Implikationen" oder ähnlich. Ich habe es bewusst drin gelassen, weil es Persona-C-Tonalität trifft (DACH-Berater reden in der Praxis genau so).

---

## Cross-Promo-Konfiguration

Im Frontmatter beider Drafts: `show_secondary_cta: true` → der Cross-Promo-Block zeigt:
- **Primär:** „Berater-Training anfragen" → `/#contact` (= Kontaktformular auf der Hauptseite, also Lead an dich direkt)
- **Sekundär (passive):** „Demnächst: berater.sapprep.de — Selbstlern-Plattform für TS452. In Vorbereitung." (kein klickbarer Link, weil Domain noch nicht live)

Wenn berater.sapprep.de live ist, kannst du den passiven Block aktivieren, indem du im Include den Link ergänzt — nichts am Post ändern.

`sapprep.de` (Endanwender-Plattform) erscheint nirgendwo. ✓

---

## Dein 5-Min-Check

1. **DE-Draft öffnen** ([`_drafts/2026-04-28-bewertungsklassen-kontenfindung-de.md`](../_drafts/2026-04-28-bewertungsklassen-kontenfindung-de.md)) — quer lesen, achten auf:
   - Stimmt die Tonalität für deine Persona-C-Zielgruppe?
   - LATAM-Block analytisch genug, oder klingt eine Stelle zu konkret/erfahrungstönend?
   - GBB-Modifikatoren (VBR, BSA, INV, ZOB, VNG) — alle korrekt?
2. **Quellen-Liste sichten** — die zwei `[QUELLE FEHLT]` markierten Einträge: URL parat oder generisch lassen?
3. **Entscheidung:**
   - **Daumen rauf, mit Quellen-Ergänzung:** SAP-Help-URLs + Note-Nummer eintragen, dann manuell `git mv` aus `_drafts/` nach `_posts/` (oder GitHub Action manuell triggern, sobald die Pipeline live ist).
   - **Daumen rauf, ohne Quellen-Ergänzung:** Sag Bescheid — ich generalisiere die Quellen-Liste (ohne `[QUELLE FEHLT]`) auf 0 Markups, dann publishen.
   - **Korrektur an einer Stelle:** Stelle nennen + Wunsch, ich überarbeite.
   - **Daumen runter:** Slot 01 verworfen, Slot 02 (Sonderbestände) rückt vor.

---

## Was die Pipeline am Ende macht (zur Kontrolle)

Wenn du Daumen rauf gibst und die GitHub Action das Move durchführt, generiert Jekyll daraus:

- `https://mb-ics.com/blog/de/bewertungsklassen-kontenfindung-internationale-rollouts/`
- `https://mb-ics.com/blog/en/valuation-class-account-determination-international-rollouts/`

Beide Pages tragen:
- schema.org `Article`-Markup mit Author, datePublished, inLanguage
- `<link rel="alternate" hreflang="de|en">` Cross-Verlinkung
- Cross-Promo-CTA → mb-ics Berater-Training (primär) + berater.sapprep.de coming-soon (sekundär)
- Disclaimer-Box am LATAM-Block mit Stand-Datum

Außerdem: Die Posts werden im Listing auf `/blog/de/` bzw. `/blog/en/` automatisch erscheinen, gefiltert auf Sprache.
