# Review-Pipeline — 5-stufiger Qualitätsprozess

**Ziel:** Top-Qualität bei minimaler Zeit-Investition für Mario. Maximaler Mario-Aufwand: ~5 Min pro Post.

---

## Übersicht

```
Stufe 1   Stufe 2          Stufe 3    Stufe 4         Stufe 5
Schreiben → Faktencheck → Stilreview → Lokalisierung → Mario-Final
(Claude)   (Claude)       (Claude)    (Claude)       (Mensch)
```

Bei Unsicherheit in Stufe 2 oder 3 → Post wird **nicht** publiziert, sondern Mario mit konkreten Fragen vorgelegt. Lieber eine Periode aussetzen als Falsches publizieren.

---

## Stufe 1 — Schreiben (DE-Original)

**Eingabe:** Themenslot aus `BLOG_PLAN.md`, TS452-Bücher als Themen-Landkarte, `SAP_MM_TS452_Favorites.txt` für Mario-Akzente

**Aufgabe:** Erstelle DE-Post nach Bridge-Variante 60/40

**Format-Vorgaben:**
- Frontmatter komplett (siehe BLOG_PLAN.md "Pflicht-Elemente")
- 1.200-1.800 Wörter
- H2/H3-Struktur, Tabellen wo sinnvoll, keine Marketing-Floskeln
- LATAM-Block klar mit `<aside class="latam-bridge">` markiert
- Persona C ansprechen ("Wenn dir als MM-Berater diese Frage begegnet...")
- **Keine** Behauptungen aus erster Hand zu LATAM-Cases

**Ausgabe:** `_drafts/2026-MM-DD-slug.md`

---

## Stufe 2 — Faktencheck

**Aufgabe:** Jede konkrete Behauptung verifizieren

**Prüf-Liste pro Aussage:**
- SAP-Funktionalität? → SAP Help Portal + SAP Note prüfen, Link in Quellen
- Transaktion / IMG-Pfad? → Aktuelle S/4HANA-Version validieren
- LATAM-Steuer/Rechtsregel? → offizielle Behörden-Quelle (SEFAZ BR, SAT MX, DIAN CO) + Datum festhalten
- Branchenbeispiel (z.B. "VW Puebla nutzt JIS")? → entweder durch öffentliche Quelle belegen oder generischer formulieren

**Markup für Unsicherheiten:**
- `[FACT-CHECK ?]` — Mario muss prüfen
- `[QUELLE FEHLT]` — Aussage entfernen oder belegen
- `[VERSIONS-DRIFT ?]` — Aussage könnte in S/4HANA-Cloud anders sein

**Ausgabeentscheidung:**
- 0 offene Markups → weiter zu Stufe 3
- 1-3 Markups → in Revision zurück an Stufe 1
- 4+ Markups → Post gestoppt, Mario informiert

---

## Stufe 3 — Stil- und Persona-Review

**Aufgabe:** Lesen aus Persona-C-Brille

**Prüf-Kriterien:**
- Würde ein Senior-MM-Berater das ohne Augenrollen lesen?
- Eröffnung: Hook im ersten Absatz oder Buzzword-Bingo?
- Berater-Tonalität: nüchtern, klar, ohne Hype-Adjektive ("revolutionär", "game-changing")
- LATAM-Block: analytisch, nicht praktiker-tönend
- Sätze: variabler Rhythmus, keine Power-Verben-Inflation
- Fachbegriffe: konsistent (z.B. nicht abwechselnd "Bewertungsklasse" und "Valuation Class")
- Konkrete Beispiele statt abstrakter Prinzipien

**Roter-Flag-Liste (automatischer Stopp bei einem Fund):**
- "Ich habe in meinem [LATAM-Land]-Projekt..."
- "Bei meinem Kunden in [LATAM-Land]..."
- "Aus meiner Erfahrung in [LATAM-Land]..."
- Hype-Phrasen ohne Beleg ("absolute Top-Lösung", "der heilige Gral")

**Ausgabe:** Geprüfter DE-Post

---

## Stufe 4 — Lokalisierung EN

**Wichtig:** **Adaption, nicht Übersetzung**

**EN-Anpassungen:**
- Persona C international: weniger DACH-spezifische Beispiele, mehr Multi-Country-Frame
- Tonalität neutraler, weniger informeller (DE "du" → EN "you" als Berater-Ansprache)
- Fachbegriffe: SAP Standard-Englisch (Valuation Class, Account Determination — nicht eigene Übersetzungen)
- LATAM-Block: aus US-/EU-HQ-Perspektive geschrieben (was muss HQ wissen)
- Hreflang-Verlinkung zwischen DE und EN

**Ausgabe:** `_drafts/2026-MM-DD-slug-en.md`

---

## Stufe 5 — Mario-Final-Check (5 Minuten)

**Mario bekommt:**
- DE-Version + EN-Version als zwei Markdown-Files
- Liste der LATAM-Behauptungen mit Quellen
- Liste der Stellen, die Stil-Review markiert hat (falls welche)

**Mario-Aufgabe:**
- Liest DE-Post (3 Min)
- Schaut LATAM-Quellen-Liste (1 Min) — passen die zur Aussage?
- Daumen rauf / Daumen runter / einzelne Korrektur (1 Min)

**Bei Daumen rauf:** Ich publiziere (Move aus `_drafts/` nach `_posts/`, Commit auf main, GitHub Pages baut automatisch)

**Bei Korrekturen:** Mario nennt Stelle + Wunsch, ich überarbeite und publiziere danach.

**Bei Daumen runter:** Post wird verworfen, nächster Themen-Slot rückt vor.

---

## Mario's tatsächlicher Zeitaufwand pro Post

| Tätigkeit | Minuten |
|---|---|
| Final-Check DE-Post | 3 |
| Quellen-Liste sichten | 1 |
| Entscheidung + ggf. Kommentar | 1 |
| **Summe pro Post** | **~5** |
| **Pro Monat (2 Posts)** | **~10** |

Bei 26 Posts/Jahr: ~2,2 Stunden Mario-Zeit für ein Jahr Content.

---

## Was gar nicht erst publiziert wird

- LATAM-Cases mit "Ich" / "wir" ohne echten Mandatshintergrund
- Steuerberatung ohne Disclaimer
- Aussagen ohne SAP-Help/SAP-Note-Quelle bei tech. Detail
- Behauptungen über Wettbewerber (namentlich)
- Posts mit mehr als 3 offenen `[FACT-CHECK ?]` Markups
