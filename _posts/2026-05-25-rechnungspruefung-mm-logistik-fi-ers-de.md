---
layout: post
lang: de
title: "Rechnungsprüfung in MM: Logistik-RP vs. FI-Direktbuchung vs. ERS — wann was"
description: "MIRO, FB60 oder ERS? Die drei Wege, eine Eingangsrechnung in SAP zu erfassen — mit ihren GR/IR-Implikationen, Toleranzen und den typischen Audit-Stolpersteinen, die in der TS452-Prüfung gerne auftauchen."
slug: rechnungspruefung-mm-logistik-rp-fi-ers
permalink: /blog/de/rechnungspruefung-mm-logistik-rp-fi-ers/
translation_key: post-003-rechnungspruefung
date: 2026-05-25
keywords: "Rechnungsprüfung, MIRO, FB60, ERS, Evaluated Receipt Settlement, GR/IR, Toleranzen, OMR6, MM Customizing, TS452, C_TS452_2601, SAP S/4HANA"
persona: C
reading_time: 9
show_secondary_cta: true
---

Drei Wege, in SAP eine Eingangsrechnung zu erfassen — und der Unterschied zwischen ihnen entscheidet nicht nur über deinen Buchungsstil, sondern über die Audit-Fähigkeit eures gesamten Procurement-Prozesses. In der TS452-Klausur taucht das in mehreren Varianten auf: oft als Szenario-Frage, manchmal als Customizing-Reihenfolge, fast immer mit einer GR/IR-Falle drin.

Dieser Beitrag bricht runter, was MIRO, FB60 und ERS tatsächlich unterscheidet — und an welchen drei Stellen die meisten Berater in der Praxis und in der Klausur stolpern.

## Die drei Wege im Überblick

| Verfahren | Transaktion | Bezug zum MM-Beleg | GR/IR-Konto involviert | Typischer Use Case |
|---|---|---|---|---|
| **Logistik-Rechnungsprüfung** | MIRO | Bestellung + Wareneingang | Ja | Standardweg für PO-basierte Beschaffung |
| **FI-Direktbuchung** | FB60 / FB65 | Kein MM-Beleg | Nein | Sonstige Rechnungen ohne Bestellbezug |
| **ERS (Evaluated Receipt Settlement)** | MRRL | Bestellung + Wareneingang | Ja (automatisch) | Hochfrequente, vertrauensbasierte Lieferantenbeziehung |

Die zentrale Unterscheidung ist nicht „welche Transaktion benutze ich" — sondern **was passiert in der Buchhaltung, und was bleibt vom Beleg im MM hängen**.

## Logistik-Rechnungsprüfung (MIRO) — der Standardweg

MIRO ist der kanonische Weg für eine Bestellrechnung. Du startest mit der Lieferantenrechnung in der Hand (oder als PDF), gibst Lieferant, Datum und Betrag ein, ziehst die Bestellung dazu — und das System schlägt dir die Positionen aus dem Wareneingang vor.

**Die Buchungslogik:**

Beim **Wareneingang** (vorgelagert, MIGO mit Bewegungsart 101) entsteht der erste Beleg:

- Bestand an **GR/IR** (Wareneingangs-/Rechnungseingangs-Konto, kontiert mit Konto WRX in der Konten-Findung)

Beim **Rechnungseingang** (MIRO) entsteht der zweite Beleg:

- **GR/IR an Verbindlichkeiten** (Lieferanten-Kreditorenkonto)

Das GR/IR-Konto ist also ein **Übergangskonto** — nach komplettem Durchlauf eines Beschaffungsvorgangs steht es theoretisch auf Null. In der Praxis ist es nie ganz auf Null, weil Mengen- oder Preisdifferenzen Restbeträge hinterlassen. Die Pflege dieser Bestände ist ein eigener Disziplin-Bereich (T-Code MR11 zur GR/IR-Klärung, in S/4HANA app-basiert ergänzt).

**Was MIRO so stark macht:**

- **Drei-Wege-Match** automatisch: Bestellung ↔ Wareneingang ↔ Rechnung werden positionsweise abgeglichen.
- **Toleranzen** greifen automatisch — wenn die Rechnung außerhalb der erlaubten Bandbreite liegt, blockt das System die Zahlung (Sperre).
- **Belegfluss** bleibt komplett: Vom Einkaufsbeleg über den Materialbeleg zum Rechnungsbeleg ist jeder Schritt rückverfolgbar.

**Stolperstelle:** Wenn MIRO als „nur eine Buchungstransaktion" verstanden wird, entgeht oft der Punkt, dass die **Position aus dem Wareneingang** (nicht aus der Bestellung) die Mengen liefert. Bei rückwirkender Stornierung eines Wareneingangs nach einer schon erfolgten Rechnungserfassung bleiben Geisterpositionen zurück, die nur über Klärungsläufe weggehen.

## FI-Direktbuchung (FB60 / FB65) — wenn es keine Bestellung gibt

Nicht jede Rechnung kommt aus dem MM-Prozess. Beratungsleistungen ohne aktive Bestellung, Mieten, Versorgerrechnungen, manche Kleinbeträge — das landet bei FB60 (Eingangsrechnung) oder FB65 (Gutschrift).

**Buchungslogik:**

- **Aufwand / Anlage an Verbindlichkeiten** — direkt, ohne GR/IR-Zwischenkonto.
- Kein MM-Beleg, kein Wareneingang, keine Toleranzprüfung gegen eine Bestellung.

**Wann FI-Direktbuchung der richtige Weg ist:**

- Es **gibt schlicht keine Bestellung** (z. B. juristische Beratungskosten, die ad-hoc angefallen sind).
- **Aufwand wurde nicht über Materialien abgewickelt** — typische Beispiele: Telefonkosten, Versicherungen, kleine Sachzuwendungen.
- **Bilanzrelevante Sofortbuchung** ohne Bestandsführungs-Komponente.

**Stolperstelle:** FB60 wird oft als „Abkürzung" missbraucht, wenn jemand keine Lust hat, eine Bestellung anzulegen. Das fliegt spätestens beim nächsten Audit auf — weil die Beschaffungsstrategie sagt, dass alles über Bestellungen läuft, und FB60 nur in dokumentierten Ausnahmen erlaubt sein darf. In der Klausur ist die Antwort auf „Was tun bei einer Lieferantenrechnung ohne PO-Bezug?" je nach Frame entweder „FB60 nutzen" — oder „erstmal eine PO anlegen lassen, dann MIRO". Lies die Frage genau.

## ERS (Evaluated Receipt Settlement) — wenn der Lieferant gar keine Rechnung mehr stellt

ERS dreht den Spieß um: **du erstellst die Rechnung selbst** auf Basis von Bestellung und Wareneingang, der Lieferant verzichtet auf den Versand einer eigenen Rechnung. Klingt erstmal seltsam, ist aber in eingespielten Lieferanten-Beziehungen mit hochfrequenten Vorgängen ein massiver Effizienzgewinn.

**Buchungslogik bei ERS (T-Code MRRL):**

- System läuft über alle abrechnungsfähigen Wareneingänge eines Lieferanten in einem definierten Zeitraum.
- Erstellt für jeden Vorgang **automatisch eine Rechnung** — basierend auf der Bestellung (Preis, Steuer, Konditionen) und dem Wareneingang (Menge).
- Verbucht intern als **GR/IR an Verbindlichkeiten**, identisch zur MIRO-Buchung.
- Lieferant bekommt die generierte Rechnung als Information.

**Voraussetzungen, ohne die ERS nicht funktioniert:**

1. **Kennzeichen am Lieferantenstamm** (Sicht „Einkauf"): Feld „Selbst-Abrechner". Ohne das Häkchen lässt das System keine ERS-Buchungen zu.
2. **Kennzeichen in der Bestellposition**: Feld „Selbst-Abrechner" auf Positions-Ebene — was am Lieferantenstamm steht, wird beim Anlegen der PO defaultet, kann aber überschrieben werden.
3. **Preis und Steuer müssen 100% klar** sein — kein „wird in der Rechnung geklärt" mehr. Was in der PO steht, wird gebucht.

**Wann ERS smart ist:**

- **Standardteile mit festem Preis**, hochfrequent (Automobilzulieferer, Verpackungsmaterial, Konsignations-Settlements).
- **Vertrauensbasierte Lieferanten-Beziehung** — der Lieferant akzeptiert, dass du die Rechnung erstellst.
- **Wenig Streit-Potenzial** über Mengen — saubere Wareneingangs-Buchungen sind Pflicht, sonst landet der Streit in der Klärungs-Hölle.

**Wann ERS in die Hose geht:**

- **Preisänderungen** während der Vertragslaufzeit, die nicht zeitgerecht in der PO landen — dann erstellt das System falsche Rechnungen.
- **Skonti / Boni** mit komplexer Berechnung — ERS ist auf Konditions-Mechanik angewiesen, freihändige Vereinbarungen außerhalb des Systems brechen den Mechanismus.
- **E-Invoicing-pflichtige Länder**: einige Behörden (BR mit NF-e, MX mit CFDI) verlangen, dass die Rechnung vom Lieferanten kommt und elektronisch validiert ist — eine ERS-Selbst-Rechnung kann hier eine zusätzliche Compliance-Schicht erfordern.

## Toleranzen — das gemeinsame Sicherheitsnetz

Egal ob MIRO oder ERS — die **Toleranzgruppen** entscheiden, was als „akzeptable Abweichung" durchgeht und was zur Zahlungssperre führt. Konfiguriert wird das in **OMR6**.

Die wichtigsten Schlüssel:

| Toleranzschlüssel | Was er prüft |
|---|---|
| **AN** | Mengenuntermangel (zu wenig geliefert vs. fakturiert) |
| **AP** | Preisabweichung positiv (Rechnung teurer als PO) |
| **BD** | Buchungsdatum vs. Bestelldatum (Karenzzeit) |
| **BR** | Bestellpreis vs. Rechnungspreis (positive Abweichung) |
| **DQ** | Mengenüberschuss in der Rechnung |
| **DW** | Wert-Abweichung (kombiniert Preis × Menge) |

**Was OMR6 nicht selbst entscheidet:** Was passiert, wenn eine Toleranz reißt. Die Sperre selbst wird über die Konfiguration der **Sperrgründe** und die Zuordnung zur Zahlungssperre gesteuert. Manche Toleranzen führen zur **Position-Sperre** (einzelner Posten in der Rechnung), andere zur **Beleg-Sperre** (gesamte Rechnung).

**Stolperstelle in der Klausur:** Toleranzen werden gerne mit einem konkreten Szenario verbunden („Eine Rechnung über 102 EUR auf eine PO von 100 EUR — Toleranz absolut 5 EUR / prozentual 5%, was passiert?"). Antwort: Innerhalb der Toleranz, keine Sperre. Aber wenn die nächste Frage absolut 1 EUR / prozentual 5% sagt, wird's enger — beide Bedingungen müssen erfüllt sein, um eine Sperre auszulösen oder nicht. Lies die Logik **immer** vollständig.

## Wie du in der Praxis (und in der Klausur) entscheidest

Die Entscheidungsmatrix, die ich Beratern mitgebe:

1. **Gibt es eine Bestellung mit Wareneingang?** Wenn ja → MIRO oder ERS.
2. **Will der Lieferant eine Rechnung erstellen?** Wenn ja → MIRO. Wenn nein und das Setup steht → ERS.
3. **Gibt es weder Bestellung noch Wareneingang?** → FB60 (oder PO nachträglich anlegen, wenn der Prozess es erlaubt).
4. **Toleranzen vor der Buchung kennen** — nicht erst dann nachschauen, wenn eine Sperre da ist.

In der TS452-Klausur achte darauf, ob der Frage-Kontext „Belegfluss prüfen" oder „Buchungsweg wählen" ist. Beide Brillen führen oft zu unterschiedlichen Antwort-Pfaden.

{% include cross-promo-cta.html show_secondary=true %}
