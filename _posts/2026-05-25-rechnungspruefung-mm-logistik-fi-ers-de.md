---
layout: post
lang: de
title: 'Rechnungsprüfung in SAP: MIRO, FI-Direktbuchung und ERS'
seo_title: 'Rechnungsprüfung in SAP: MIRO, FI-Direktbuchung und ERS'
description: Bestellbezug, WE/RE, ERS-Voraussetzungen und Toleranzschlüssel sauber unterscheiden.
slug: rechnungspruefung-mm-logistik-rp-fi-ers
permalink: /blog/de/rechnungspruefung-mm-logistik-rp-fi-ers/
translation_key: post-003-rechnungspruefung
date: 2026-05-25
reading_time: 5
author: Mario Bahunek
last_modified_at: '2026-11-02'
system_reference: SAP S/4HANA On-Premise / Private Edition; Dokumentationsbezug 2025 FPS01. Ergänzende Quellen nennen ihren eigenen Stand.
review_status: pending_mario_and_independent_review
sources:
- label: 'SAP Help: Invoice Processing'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/f3419342409c4a7cb0b2d27f801d38b1/ab6fb6531de6b64ce10000000a174cb4.html
  note: SAP S/4HANA; PO, GR and non-PO references; accessed 2026-11-02
- label: 'SAP Learning: Entering Invoices with Variances'
  url: https://learning.sap.com/courses/invoice-verification-in-sap-s-4hana/entering-invoices-with-variances-1
  note: SAP S/4HANA; OMR6 and accounting for variances; accessed 2026-11-02
- label: 'SAP Help: Return Delivery in Goods-Receipt-Based Invoice Verification'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/eb63bd534f22b44ce10000000a174cb4.html?version=2023.latest
  note: SAP S/4HANA 2023 documentation; reversal dependency, supplementary only; accessed 2026-11-02
- label: 'SAP Help: Evaluated Receipt Settlement'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/b846b365dbf64aa3a251fbdb53f4c97e/796fb6531de6b64ce10000000a174cb4.html
  note: SAP S/4HANA 2025 FPS01; prerequisites and test mode; accessed 2026-11-02
- label: 'SAP Help: Tolerance'
  url: https://help.sap.com/docs/SUPPORT_CONTENT/spmm/3362167829.html
  note: SAP support content; exact key definitions; no release version shown; accessed 2026-11-02
- label: 'SAP Help: Blocking Invoices'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/af9ef57f504840d2b81be8667206d485/7870b6531de6b64ce10000000a174cb4.html
  note: SAP S/4HANA 2025 FPS01; whole-invoice payment block; accessed 2026-11-02
- label: 'SAP Learning: Handling of Variances Without Reference to an Item'
  url: https://learning.sap.com/courses/invoice-verification-in-sap-s-4hana/handling-of-variances-without-reference-to-an-item
  note: SAP S/4HANA; BD and supplier-specific tolerances; accessed 2026-11-02
- label: 'SAP Help: Supplier Invoice in Finance'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/b2d44c1091094b5a810c2a879ee95522/7b43c20ec48e46768de3cb7d00024b5d.html?locale=en-US&state=PRODUCTION&version=2025.001
  note: SAP S/4HANA 2025 FPS01; FB60/FB65 transaction names only, no localization claim; accessed 2026-11-02
- label: 'SAP Help: Vendor Consignment (MM-IM)'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/8a57feade137489098f59374c06f1e0e/6507b753128eb44ce10000000a174cb4.html?locale=en-US
  note: SAP S/4HANA 2025 FPS01; MRKO settlement transaction; accessed 2026-11-02
---

Der Buchungsweg richtet sich nach dem Geschäftsprozess. Eine Lieferantenrechnung kann mit Bestellbezug, mit Bezug auf einzelne Wareneingänge oder ohne Bestellbezug verarbeitet werden. „Keine Bestellung“ bedeutet deshalb nicht automatisch „MIRO ist ausgeschlossen“. [1](#source-1)

## MIRO und FI-Direktbuchung

Die Logistik-Rechnungsprüfung kann Bestellhistorie und Wareneingänge berücksichtigen. Bei **bestellbezogener** Rechnungsprüfung werden Bestellpositionen abgerechnet; bei **WE-bezogener** Rechnungsprüfung erfolgt die Zuordnung zu einzelnen Lieferungen. Nicht jede MIRO-Rechnung ist daher zwingend ein Drei-Wege-Abgleich mit bereits gebuchtem Wareneingang. Direktbuchungen auf Sach- oder Materialkonten ohne Bestellbezug sind ebenfalls vorgesehen. [1](#source-1)

FB60 beziehungsweise FB65 dienen der direkten Erfassung einer Kreditorenrechnung beziehungsweise Gutschrift in FI. Welche Oberfläche verwendet wird, muss zum freigegebenen Rechnungsprozess passen. Eine FI-Direktbuchung ersetzt keine Prüfung gegen die MM-Bestellhistorie. [8](#source-8)

## Was das WE/RE-Konto zeigt

Für ein vereinfachtes Beispiel mit bewertetem Lagermaterial, identischem Bestell- und Bewertungspreis und ohne Steuern, Nebenkosten oder Abweichungen gilt:

- Wareneingang: **Bestand an WE/RE**.
- Rechnungseingang: **WE/RE an Lieferantenverbindlichkeit**.

Bei Preis- und Mengenabweichungen ist die Buchungslogik differenzierter. Preisabweichungen können abhängig von Preissteuerung und Bestandsdeckung auf Bestand oder Preisdifferenzen wirken; ein offener WE/RE-Saldo ist daher nicht pauschal eine Preisdifferenz. [2](#source-2)

Auch eine WE-Stornierung nach Rechnungseingang erzeugt nicht einfach „Geisterpositionen“. Zulässigkeit und Folgeschritte hängen von den Einstellungen ab; Rechnung stornieren oder eine passende Folge-WE-Zuordnung herstellen sind dokumentierte Möglichkeiten. [3](#source-3)

## ERS: Abrechnung ohne separate Lieferantenrechnung

Bei der automatischen Wareneingangsabrechnung werden die Rechnungsdaten aus Bestellung und Wareneingang abgeleitet. Dafür ist eine Vereinbarung mit dem Lieferanten erforderlich. Im klassischen Prozess wird **MRRL** verwendet. Zur Vorbereitung gehören insbesondere:

- ERS-Kennzeichen in den relevanten Lieferanten-Einkaufsdaten und Bestellpositionen.
- Wareneingang mit Bestellbezug und WE-bezogene Rechnungsprüfung.
- Steuerkennzeichen in der Bestellposition; kein als geschätzt markierter Bestellpreis.

Ein Testlauf zeigt abrechenbare und nicht abrechenbare Vorgänge, ohne zu buchen. Ausgabe und Zustellung des Abrechnungsbelegs müssen eingerichtet sein. Konsignationsabrechnung über MRKO ist ein separates Verfahren. [4](#source-4) [9](#source-9)

ERS vergleicht keine separat übermittelte Lieferantenrechnung mit der Bestellung. Die frühere Gleichsetzung sämtlicher MIRO- und ERS-Abweichungsprüfungen war deshalb irreführend. Ebenso wurde die pauschale Aussage zur Zulässigkeit von ERS in Brasilien und Mexiko zurückgenommen; ein konkreter Länderprozess ist hier nicht geprüft.

## Toleranzschlüssel richtig zuordnen

Die folgenden Schlüssel gehören zur Logistik-Rechnungsprüfung. Die Grenzen werden buchungskreisabhängig unter **Materialwirtschaft → Logistik-Rechnungsprüfung → Rechnungssperre → Toleranzgrenzen festlegen (OMR6)** gepflegt. [2](#source-2)

| Schlüssel | Prüfgegenstand |
|---|---|
| AN | Positionsbetrag ohne Bestellbezug, bei aktivierter Betragsprüfung |
| AP | Positionsbetrag mit Bestellbezug, gemäß aktivierter Betragsprüfung |
| BD | Automatisches Ausgleichen kleiner Saldodifferenzen |
| BR | Prozentuale Bestellpreismengenabweichung bei Rechnung vor Wareneingang |
| BW | Prozentuale Bestellpreismengenabweichung bei Wareneingang vor Rechnung |
| DQ | Mengenabweichung gegenüber der erwarteten Menge |
| DW | Mengenabweichung bei erwartetem, aber noch nicht gebuchtem Wareneingang (WE-Menge null) |
| PP | Preisabweichung |
| ST | Terminabweichung, bewertet über Betrag × Tage |

BR prüft das Verhältnis von Bestellpreismengeneinheit und Bestellmengeneinheit, nicht einfach einen höheren Rechnungspreis. DW ist keine kombinierte Preis-Wert-Abweichung. [5](#source-5)

## Warnung, Zahlungssperre und Buchungsverhinderung trennen

Eine Abweichung an einer Position kann zur Zahlungssperre der **gesamten Rechnung** führen. Der FI-Beleg kann dabei bereits gebucht sein. Eine untere Grenzunterschreitung ist nicht mit einer oberen Grenzüberschreitung gleichzusetzen. [6](#source-6) [2](#source-2)

BD behandelt einen Rechnungssaldo, keine Datumsabweichung. Lieferantenspezifische Toleranzen können Vorrang haben. „Nicht prüfen“ ist keine strenge Nulltoleranz. Für die Wirkung absoluter und prozentualer Grenzen muss die Dokumentation des jeweiligen Schlüssels herangezogen werden; eine pauschale UND-Regel ist falsch. [7](#source-7)

**Prüfstand:** Quellenabgleich am 02.11.2026, kein SAP-Systemtest. Ein Testmandant muss Preis (PP), Menge (DQ/DW), Bestellpreismenge (BR/BW), Termin (ST), Positionsbetrag (AN/AP) und Saldodifferenz (BD) getrennt abdecken. Dieser Artikel verspricht keine bestimmten Prüfungsfragen oder Prüfungsergebnisse.
