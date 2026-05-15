---
layout: post
lang: de
title: "Sonderbestände in MM (K, E, Q) — wann welcher Typ, und was viele übersehen"
description: "Konsignation, Projektbestand, Q-Bestand: warum die Wahl des Sonderbestand-Typs nicht nur ein Customizing-Schalter ist — und wo sie in internationalen Setups (besonders MX-Maquiladora) reproduzierbar kippen."
slug: sonderbestaende-mm-konsignation-projektbestand-q-bestand
permalink: /blog/de/sonderbestaende-mm-konsignation-projektbestand-q-bestand/
translation_key: post-002-sonderbestaende
date: 2026-05-15
keywords: "Sonderbestand, Konsignation, K-Bestand, Projektbestand, E-Bestand, Q-Bestand, Bestandsumbuchung, Maquiladora, MM Customizing, SAP S/4HANA, TS452"
persona: C
latam_topic: "MX Maquiladora-Modell und Konsignation, Zollimplikationen"
reading_time: 9
show_secondary_cta: true
sources:
  - label: "SAP Help Portal — Special Stocks (MM)"
    url: "https://help.sap.com/"
    note: "Suchpfad: Materials Management → Inventory Management → Special Stocks"
  - label: "SAP Customizing IMG — T-Codes OMJJ (Bewegungsarten) und SPRO Materialwirtschaft → Bestandsführung"
  - label: "SAP Help Portal — Localization for Mexico (Maquiladora, IMMEX)"
    url: "https://help.sap.com/"
    note: "Stand 2026 — vor produktivem Rollout aktuelle Version prüfen"
  - label: "Mexikanisches Wirtschaftsministerium — IMMEX-Programm (offizielle Quelle für Maquiladora-Status)"
---

Wenn dir als MM-Berater im Bestandsbericht plötzlich die Augen tränen — ein Material taucht doppelt auf, einmal mit Bestandskennzeichen K, einmal als unrestricted, plus drei verschiedene Werte je nach Buchungskreis-View — sind die Sonderbestände selten der eigentliche Bug. Sie sind das Symptom, dass jemand entweder den falschen Typ gewählt hat oder eine Bestandsumbuchung mit der falschen Bewegungsart gefahren ist.

Dieser Beitrag bricht runter, was die Sonderbestand-Kennzeichen K, E und Q tatsächlich tun, wann welcher Typ passt — und warum besonders das mexikanische Maquiladora-Modell auf einer korrekten Konsignations-Konfiguration steht oder fällt.

## Was Sonderbestände eigentlich sind

In SAP MM bedeutet „Sonderbestand" nicht „besonderer Bestand" im Sinne von „kostbar" oder „selten". Es bedeutet: ein Bestand, dessen **Eigentumsverhältnis oder Verwendungszweck** vom Standard-Werks-/Lagerortbestand abweicht. Das System führt diese Sonderbestände parallel zum unrestricted Bestand, mit eigenem Mengen- und Wertegerüst, gesteuert über ein **Sonderbestand-Kennzeichen** an der Bewegungsart.

Die drei Kennzeichen, die im Tagesgeschäft begegnen:

| Kennzeichen | Klartext | Eigentum | Wertgerüst |
|-------------|----------|----------|-------------|
| K | Konsignationsbestand vom Lieferanten | Lieferant | Bei Verbrauch wird gebucht, vorher kein Wert |
| E | Projektbestand (PSP-Element-bezogen) | Eigentümer-Buchungskreis | Bewertet, Projektwert wird aktiviert |
| Q | Projekt-Q-Bestand (Projekt mit zusätzlicher Reservierung) | Eigentümer-Buchungskreis | Wie E, mit zusätzlichem Verfügbarkeits-Block |

Es gibt weitere Kennzeichen (V für Versand-Konsignation an Kunden, M für Retouren, W für Konsignations-Bestand beim Kunden), aber die spielen im typischen Berater-Alltag deutlich seltener eine Rolle.

## K-Bestand: der Lieferant bleibt Eigentümer

Konsignations-Bestand vom Lieferanten ist ein häufig missverstandenes Konzept. Der physische Bestand liegt in deinem Werk oder Lager — du verwaltest ihn, du zählst ihn bei der Inventur, du siehst ihn in MMBE. Aber er gehört dem Lieferanten, bis der Verbrauch gebucht wird.

**Buchungslogik bei K-Bestand:**

- **Wareneingang Bewegungsart 411 K:** Bestand kommt rein, **kein FI-Beleg** (keine Wertbuchung, weil noch nicht eigenes Eigentum).
- **Verbrauch Bewegungsart 411 K (in Verbrauchskontierung):** Erst hier knallt der Buchungssatz: Verbrauchskonto an Verbindlichkeiten-Konsignation.
- **Settlement (T-Code MRKO):** Periodische Abrechnung über die Konsignations-Verträge — generiert die FI-Belege, die zur Lieferanten-Rechnung werden.

**Wann K-Bestand sinnvoll ist:**
- Material mit **häufiger Bewegung**, bei dem du nicht jede Bestellung einzeln freigeben willst (Schrauben, Standard-Bauteile, Verbrauchsmaterial).
- **Hochpreisige Materialien**, die du nicht aktivieren willst, bevor sie tatsächlich verbraucht sind (Cash-Flow-Effekt).
- **Lieferant ist nahe** und kann den Bestand günstig nachfüllen — typisch für Just-in-Time-Setups in der Automobilindustrie.

**Stolperstelle:** Bestandsumbuchungen K → eigener Bestand sind eine getrennte Buchung (Bewegungsart 411 K mit Sonderlogik plus Bewegungsart 561 oder ähnliches für die Eigentumsübernahme — bei manchen Setups eine Pärlings-Buchung in MIGO mit „Kauf vom Konsignationsbestand"-Funktion). Das wird oft falsch gemacht und produziert Phantom-Bestand.

## E-Bestand: Projektbestand mit eigener Bewertung

Wenn du in einem Anlagenbau-Projekt oder einem großen Kundenauftrag arbeitest, wird Material oft auf ein PSP-Element oder einen Kundenauftrag bestellt. Der Bestand kommt rein, gehört dem Buchungskreis (anders als K), wird aber dem Projekt zugeordnet — sowohl mengen- als auch wertmäßig.

**Buchungslogik bei E-Bestand:**

- **Wareneingang Bewegungsart 412 E:** Bestand kommt rein, FI-Beleg auf Projekt-Aktivkonto (statt Standard-Bestandskonto).
- **Verbrauch Bewegungsart 411 E:** Verbrauch geht direkt in die Projekt-Kosten.
- **Bestandsumbuchung 415 E → unrestricted:** wird selten genutzt, weil Projektbestand normalerweise im Projekt verbleibt.

**Wann E-Bestand sinnvoll ist:**
- **Anlagenbau** mit langer Bauphase, bei dem Material monate- oder jahrelang im Werk liegt, aber auf das Projekt aktiviert werden soll.
- **Kundenspezifische Sonderausführung** — Material gehört nicht zum normalen Lagerumlauf, sondern zu einem konkreten Auftrag.

**Stolperstelle:** Wenn das PSP-Element gesperrt oder geschlossen wird, friert der E-Bestand ein. Vor Inventur prüfen, ob alle E-Bestände aktiven Projekten zugeordnet sind — sonst gibt es bei der Bewertungsänderung böse Überraschungen.

## Q-Bestand: Projektbestand mit Verfügbarkeits-Reservierung

Q-Bestand ist eine Variante von E mit einer wichtigen zusätzlichen Eigenschaft: die Menge ist **gegen weiteren Zugriff reserviert**. Das ist der Use-Case, wenn du sicher sein willst, dass das Material nicht aus Versehen für ein anderes Projekt entnommen wird.

In der Praxis ist Q seltener als E. Du brauchst es bei:
- **Mehrjährigen Projekten** mit überlappenden Bestellungen, bei denen du Material aus Phase 1 nicht aus Versehen für Phase 2 verbrauchst.
- **Regulierten Industrien** (Pharma, Defense), bei denen jede Materialbewegung dokumentiert sein muss und versehentliche Cross-Projekt-Buchungen ein Audit-Problem sind.

## Bestandsumbuchungen — die häufigste Fehlerquelle

Die meisten Tickets, die im Bestandsbereich auftauchen, drehen sich nicht um die Sonderbestand-Konfiguration selbst, sondern um Umbuchungen. Drei Bewegungsarten, die du im Schlaf können musst:

| Bewegungsart | Was passiert | Typischer Fehler |
|---|---|---|
| 309 | Material-zu-Material innerhalb desselben Werks/Lagerorts | Wird oft missbraucht für „Workaround" wenn das Customizing nicht passt |
| 311 | Lagerort-zu-Lagerort innerhalb desselben Werks | Sieht trivial aus, aber bei Sonderbestand muss das Kennzeichen bei beiden Buchungen passen |
| 301 | Werks-zu-Werks (= Cross-Plant-Move) | Bei Bewertungskreis = Werk knallt es, wenn die Bewertungsklasse zwischen den Werken nicht synchron ist |

**Zentrale Regel:** Eine Umbuchung darf den Sonderbestand-Status nicht implizit ändern. Wenn du K-Bestand auf eigenen Bestand umbuchen willst, brauchst du dafür eine **explizite Eigentumsübernahme** (in MIGO meistens als getrennter Schritt im Konsignations-Modus), keine simple 309/311.

<aside class="latam-bridge">

<div class="latam-bridge__head">Internationaler Ausblick — Mexiko-Maquiladora</div>

### Konsignation als Rückgrat des Maquiladora-Modells

Das mexikanische Maquiladora-Modell (formal: **IMMEX-Programm** des Wirtschaftsministeriums) erlaubt es ausländischen Unternehmen, Material zollfrei und steuerlich begünstigt nach Mexiko zu importieren, in einer mexikanischen Produktionsstätte zu bearbeiten und das fertige Produkt wieder zu exportieren — typischerweise in die USA. Das Material gehört während der gesamten Sequenz formal dem ausländischen Eigentümer (z. B. der US- oder DACH-Muttergesellschaft), nicht der mexikanischen Tochter.

In SAP bildet sich das fast immer als **Konsignations-Modell** ab:

- Die mexikanische Tochter führt den Bestand mit Sonderbestand-Kennzeichen K — physisch in MX, Eigentum bleibt beim ausländischen Lieferanten/Mutterkonzern.
- Bewegungsarten und Konten-Findung sind so eingestellt, dass beim Wareneingang **kein** mexikanischer Bilanzwert entsteht (Bestand wird nicht aktiviert), und beim Verbrauch keine **IVA** (Mehrwertsteuer) anfällt, weil der Verbrauch im Maquiladora-Kontext kein steuerlicher Verkauf ist.
- Die Localization für Mexiko in S/4HANA bringt dafür spezifische Konditionen und CFDI-Logik mit (CFDI ist die elektronische Rechnungspflicht in MX, vergleichbar mit BR-NF-e).

**Drei Stellen, an denen das in der Praxis kippt:**

- **Bestand wird mit „eigenem" Kennzeichen aktiviert.** Wenn beim Wareneingang versehentlich Bewegungsart 101 statt 411 K verwendet wird, aktiviert die mexikanische Tochter den Materialwert in ihrer Bilanz — und damit ist der steuerliche Maquiladora-Vorteil im Eimer. Reparatur ist möglich, aber lästig (Storno, Re-Buchung) und im Quartalsabschluss sichtbar.
- **CFDI bei Konsignations-Verbrauch fehlt oder doppelt.** Das CFDI-Setup muss zwischen „echtem" Verkauf und Maquiladora-internem Verbrauch unterscheiden. Falsch konfiguriert: entweder eine fehlende Steuermeldung (= Audit-Risiko durch SAT) oder eine doppelte Rechnung (= Reklamation).
- **Settlement zwischen MX-Tochter und Mutter wird wie eine reguläre Lieferanten-Rechnung behandelt.** Konsignations-Settlement (in SAP über T-Code MRKO) muss mit dem korrekten **Pricing-Schema** und **CFOP-Äquivalent für MX** laufen — sonst verschwimmen die Konzern-internen Buchungen mit echten Lieferanten-Beziehungen.

**Kolumbien** kennt mit der **Free Trade Zone (Zona Franca)** ein verwandtes Modell — ähnliche Logik, andere Steuer-Implikationen (DIAN-Reporting, ICA-Abgaben). Wer beide Länder im Konzern-Setup hat, sollte nicht ein Setup auf das andere kopieren.

</aside>

{% include disclaimer-latam.html sources="SAP Help Portal (Localization for Mexico, Localization for Colombia), IMMEX-Programm-Dokumentation des Mexikanischen Wirtschaftsministeriums, SAP-Standard-Customizing für Konsignation." %}

## Praktischer Check: welcher Sonderbestand wann?

Eine Entscheidungsmatrix, die in der Architektur-Phase Diskussionen verkürzt:

| Anwendungsfall | Empfohlener Typ | Warum nicht der andere |
|---|---|---|
| C-Teile, Standard-Schrauben, Verbrauchsmaterial | K (Konsignation) | E würde Projektzuordnung erzwingen, die hier sinnlos ist |
| Anlagenbau, Großprojekt mit jahrelanger Bauphase | E (Projektbestand) | K würde dem Lieferanten Hoheit geben, den du bei Eigenleistung nicht abgibst |
| Pharma-Wirkstoff für regulierten Auftrag | Q (Projekt mit Reservierung) | E ohne Reservierung lässt versehentliche Cross-Auftrag-Entnahmen zu |
| Maquiladora MX (Mutterkonzern → Tochter) | K mit MX-Localization | Eigener Bestand würde den steuerlichen IMMEX-Vorteil zerstören |
| Streckenbestellung Lieferant → Kunde direkt | kein Sonderbestand (= Streckenmodell) | K hieße, der Bestand käme physisch zu dir — bei Strecke nicht der Fall |

## Worauf es im Klausur-Kontext (TS452) ankommt

Die Examen-Fragen zu Sonderbeständen testen praktisch immer die Grundlogik plus eine Bewegungsart-Frage. Was du sicher wissen solltest:

- **Welches Kennzeichen bedeutet was** (K, E, Q — die Reihenfolge in der Klausur ist fast immer alphabetisch).
- **Welche Bewegungsart** für welchen Sonderbestand-Typ (411 K für Konsignations-Verbrauch, 412 E für Projektbestand-Wareneingang).
- **Eigentumsverhältnis vs. Bestandsführung** — Sonderbestand bedeutet nicht, dass du den Bestand nicht physisch hast.
- **Settlement bei Konsignation** — über MRKO, nicht über reguläre Rechnungsprüfung.

Eine Beobachtung aus der Trainings-Praxis: Wer die Sonderbestand-Kennzeichen nur als Buchstaben-Liste auswendig lernt, scheitert an Anwendungsfragen. Wer dagegen den **Buchungssatz für jede Variante durchgehen kann** — was passiert beim Wareneingang, was beim Verbrauch, was beim Settlement — hat den Stoff im Griff.

## Schluss

Sonderbestände sind keine technische Kuriosität. Sie sind die Stelle, an der dein Einkauf, dein Controlling und (bei Maquiladora-Setups) dein Tax-Team an demselben Material-Datensatz hängen. Wer sie als „nur Customizing-Schalter" behandelt, baut Reporting-Drift ein, die ein paar Quartale später als Bestandsdifferenz oder Steuer-Audit-Issue zurückkommt.

Vor jedem internationalen Rollout: einmal die Sonderbestand-Strategie durchsprechen — welche Typen werden gebraucht, welche Bewegungsarten sind dafür customizt, und wer im Konzern darf welche Umbuchung machen. Das ist eine 30-Minuten-Diskussion, die später Tage an Reparatur spart.
