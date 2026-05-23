# mb-ics Blog — TS452 Track (B2B-Positionierung)

**Stand:** Mai 2026 · **Frequenz:** 2x/Woche (Mo + Do) · **Sprachen:** DE + EN · **Format:** 100% TS452-MM-Kern, LATAM-Bonus nur wenn natürlich passend

> Ablöse von BLOG_PLAN.md (40%-LATAM-Bridge) durch reinen TS452-Fokus für B2B-SEO und Authority-Signal gegenüber L&D-Procurement bei KPMG / K2 University / Accenture LearnVantage.

---

## Strategischer Frame

**Zielgruppe (neu):** L&D-Procurement und Senior-Consultants bei Beratungen + Enterprise SAP-Teams. Suchen aktiv: "TS452 prep", "C_TS452_2601 vorbereitung", "SAP MM consultant training", spezifische MM-Topics ("OBYC Kontenfindung", "Bewertungsklassen", "Konsignation Customizing").

**Was bleibt vom alten Plan:**
- Persona-Tonalität (Berater spricht zu Berater, "ich"-Form)
- TS452-Buch als Themen-Landkarte, **kein** 1:1-Copy
- Schreibstil: faktisch, recherche-belegt, ohne Marketing-Floskeln

**Was ändert sich:**
- ❌ Kein verpflichtender LATAM-Block (40%) mehr → optional, nur bei natürlich passenden Themen
- ❌ Keine Disclaimer-Boxen "Stand 2026, Quelle …" als Pflichtfeld → nur bei tatsächlichen Localization-Posts
- ❌ Persona A (DACH/US-Entscheider mit LATAM-Töchtern) raus → zu engl Nische für B2B
- ✅ Primärer CTA neu: **Crashcourse-Waitlist** (`/sap-mm-crashcourse/`) + Partner-Inquiry (`#partners`)
- ✅ Sekundärer CTA: Discovery-Call / Trainingsangebot anfragen
- ✅ sapprep.de bleibt auch hier außen vor (falsche Zielgruppe)

---

## 16 Posts × 8 Wochen (2x/Woche)

Bereits live (LATAM-Bonus, bleiben publiziert):
- *Bewertungsklassen und Kontenfindung in MM* (2026-04-29)
- *Sonderbestände in MM (K, E, Q)* (2026-05-15)

### Neue Posts — Wochenplan

| Wo | Mo | Do |
|---|---|---|
| 1 | Rechnungsprüfung MM: Logistik-RP vs. FI vs. ERS | Source List / Orderbuch / Quotierung — die Verwechslung |
| 2 | Bestellanforderung & Releasestrategie via Klassifizierung | Wareneingang & Bewegungsarten 101/102/561 |
| 3 | Kontraktarten: Mengen- vs. Wertkontrakt | Lieferplan vs. Rahmenvertrag — wann was |
| 4 | Materialart & Branche — die unterschätzten Customizing-Felder | Lieferantenstammdaten: zentral / EK / BuKr |
| 5 | Standardpreis vs. gleitender Durchschnitt — die V/S-Entscheidung | Materialledger: das vernachlässigte Power-Tool |
| 6 | Subcontracting / Lohnbearbeitung (Bestellart L) | Konsignation in MM — Lieferant bleibt Eigentümer |
| 7 | MRP-Grundlagen im Multi-Plant-Setup | MRP-Verfahren PD / VB / V1 / R1 — wann welches |
| 8 | Konditionen & Preisfindung im EK (Konditionsschemata) | Klausurstrategie TS452: Fragetypen, Fallen, Zeitmanagement |

---

## Pflicht-Elemente pro Post

1. **Title** — Hauptkeyword im Titel, max. 65 Zeichen
2. **Meta-Description** — 150-160 Zeichen, USP klar
3. **Lead** — 2-3 Sätze, Berater-zu-Berater-Tonalität
4. **MM-Inhalt** — 1500-2500 Wörter, faktisch, Customizing-Hinweise wo relevant
5. **Code/Transaktionen** — T-Codes, IMG-Pfade als `<code>`-Blöcke
6. **CTA-Block am Ende** — Crashcourse-Waitlist + Partner-Inquiry (NICHT sapprep)
7. **Frontmatter:**
   - `lang: de` / `lang: en`
   - `translation_key: post-XXX-slug` (DE+EN paaren über gleichen Key)
   - `keywords: ...TS452, MM, [Topic]...`
   - `persona: C` (bleibt: DACH/Senior-Consultant)
   - `reading_time: X` (Berechnung: Wörter / 200)
   - **Kein** `latam_topic` für Pure-TS452-Posts. Nur setzen wenn Post natürlich LATAM-Bezug hat.

---

## Was NICHT mehr in den Blog kommt

- ❌ LATAM-Bridge als Pflicht-Element
- ❌ "Mit LATAM-Perspektive"-Badge auf Pure-TS452-Posts
- ❌ Sapprep.de-CTAs
- ❌ Berater.sapprep.de-Sekundär-CTAs (Beta läuft, aber bleibt aus dem Blog raus)
- ❌ Comcave / GFN / Bildungsträger-Sprache

---

## Operationalisierung

- **Auto-Publish-Workflow** (`.github/workflows/auto-publish-drafts.yml`): Cron auf 2x/Woche (Mo + Do 09:00 UTC) umgestellt
- **Drafts** liegen in `_drafts/`, mit gleichem Frontmatter-Schema wie `_posts/`. Auto-Publish zieht den ältesten Draft + Translation-Partner.
- **Surface von Homepage**: Insights-Link in Hauptnav (DE/EN/ES) — sichtbar ab erstem TS452-Post

---

## Verwandt

- [BLOG_PLAN.md](BLOG_PLAN.md) — alter Plan mit LATAM-Bridge (archiviert, neue Posts folgen diesem Plan nicht mehr)
- [REVIEW_PIPELINE.md](REVIEW_PIPELINE.md) — Draft-Review-Workflow (gilt weiter)
