---
layout: post
lang: de
title: 'Sonderbestände in SAP MM: K, E und Q richtig unterscheiden'
seo_title: 'Sonderbestände in SAP MM: K, E und Q richtig unterscheiden'
description: 'Konsignation, Kundenauftragsbestand und Projektbestand: Zuordnung, Bewertung und die Bedeutung von 411 K.'
slug: sonderbestaende-mm-konsignation-projektbestand-q-bestand
permalink: /blog/de/sonderbestaende-mm-konsignation-projektbestand-q-bestand/
translation_key: post-002-sonderbestaende
date: 2026-05-15
reading_time: 5
author: Mario Bahunek
last_modified_at: '2026-11-02'
system_reference: 'SAP-S/4HANA-On-Premise-Dokumentation: 2025 FPS02 (Oktober 2026). Ergänzende Learning-/Support-Quellen ohne ausgewiesenen Release; siehe Einzelquellen.'
review_status: pending_mario_and_independent_review
sources:
- label: 'SAP Help: Externally-Owned Special Stocks'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/a361bd534f22b44ce10000000a174cb4.html?locale=en-US&version=2025.002
  note: SAP S/4HANA (on-premise documentation); stock assignment and stock types; 2025 FPS02 (Oct 2026); accessed 2026-11-02.
  edition: SAP S/4HANA (on-premise documentation)
  release: 2025 FPS02 (Oct 2026)
  version_parameter: '2025.002'
  version_policy: FIXED_RELEASE_PARAMETER
  retrieved: '2026-11-02'
- label: 'SAP Help: Make to Order Scenario (Sales Order Stock)'
  url: https://help.sap.com/docs/SUPPORT_CONTENT/ficontrolling/3361881737.html
  note: SAP Support Content; no edition-specific release designation; E/Q indicators; No release stated; accessed 2026-11-02.
  edition: SAP Support Content; no edition-specific release designation
  release: null
  version_parameter: null
  version_policy: NO_PUBLISHED_RELEASE
  retrieved: '2026-11-02'
- label: 'SAP Help: Sales Order Stock'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/6362bd534f22b44ce10000000a174cb4.html?locale=en-US&version=2025.002
  note: SAP S/4HANA (on-premise documentation); assignment, valuation and movements; 2025 FPS02 (Oct 2026); accessed 2026-11-02.
  edition: SAP S/4HANA (on-premise documentation)
  release: 2025 FPS02 (Oct 2026)
  version_parameter: '2025.002'
  version_policy: FIXED_RELEASE_PARAMETER
  retrieved: '2026-11-02'
- label: 'SAP Help: Non-valuated project stock'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/cc8f759e1b0e4f3b8048c3cf808d4068/ccceb65334e6b54ce10000000a174cb4.html?locale=en-US&version=2025.002
  note: SAP S/4HANA (on-premise documentation); quantity-only project stock; 2025 FPS02 (Oct 2026); accessed 2026-11-02.
  edition: SAP S/4HANA (on-premise documentation)
  release: 2025 FPS02 (Oct 2026)
  version_parameter: '2025.002'
  version_policy: FIXED_RELEASE_PARAMETER
  retrieved: '2026-11-02'
- label: 'SAP Learning: Performing the Process of Vendor Consignment'
  url: https://learning.sap.com/courses/inventory-management-and-physical-inventory-in-sap-s-4hana/performing-the-process-of-vendor-consignment
  note: SAP S/4HANA; edition not specified in lesson title; consignment replenishment, withdrawal and settlement; No release stated; accessed 2026-11-02.
  edition: SAP S/4HANA; edition not specified in lesson title
  release: null
  version_parameter: null
  version_policy: NO_PUBLISHED_RELEASE
  retrieved: '2026-11-02'
- label: 'SAP Help: How to post a stock transfer for Consignment Material'
  url: https://help.sap.com/docs/SUPPORT_CONTENT/erpscm/3362168070.html
  note: SAP Support Content; no edition-specific release designation; 411 K; supplemental legacy support article; No release stated; accessed 2026-11-02.
  edition: SAP Support Content; no edition-specific release designation
  release: null
  version_parameter: null
  version_policy: NO_PUBLISHED_RELEASE
  retrieved: '2026-11-02'
- label: 'SAP Help: Transfer Posting: From Consignment to Company-Owned Stock'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/af9ef57f504840d2b81be8667206d485/a65eb6531de6b64ce10000000a174cb4.html?locale=en-US&version=2025.002
  note: SAP S/4HANA (on-premise documentation); stock account and consignment liability; 2025 FPS02 (Oct 2026); accessed 2026-11-02.
  edition: SAP S/4HANA (on-premise documentation)
  release: 2025 FPS02 (Oct 2026)
  version_parameter: '2025.002'
  version_policy: FIXED_RELEASE_PARAMETER
  retrieved: '2026-11-02'
- label: 'SAP Help: Goods Movement Type'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/ee6ff9b281d8448f96b4fe6c89f2bdc8/8b7b5fe73ef54063a2bfcfbe83cebd38.html?locale=en-US&version=2025.002
  note: SAP S/4HANA (on-premise documentation); 101 purchase-order receipt and 561 initial entry; read with consignment source; 2025 FPS02 (Oct 2026); accessed 2026-11-02.
  edition: SAP S/4HANA (on-premise documentation)
  release: 2025 FPS02 (Oct 2026)
  version_parameter: '2025.002'
  version_policy: FIXED_RELEASE_PARAMETER
  retrieved: '2026-11-02'
---

K, E und Q beantworten unterschiedliche Fragen: Gehört der Bestand noch dem Lieferanten? Ist er einem Kundenauftrag oder einem Projekt zugeordnet? Das Sonderbestandskennzeichen ist von der Bestandsart zu trennen. Auch Sonderbestand kann frei verwendbar, in Qualitätsprüfung oder gesperrt sein. [1](#source-1)

## Die drei Kennzeichen

| Kennzeichen | Bedeutung | Zuordnung |
|---|---|---|
| K | Lieferantenkonsignation | Lieferant |
| E | Kundenauftragsbestand | Kundenauftrag und Position |
| Q | Projektbestand | PSP-Element |

E steht **nicht** für Projektbestand. Q ist keine zusätzliche Reservierungsvariante von E und bedeutet hier auch nicht Qualitätsprüfbestand. [2](#source-2)

Das Kennzeichen allein erklärt außerdem nicht die Bewertung: Kundenauftrags- und Projektbestand können je nach Prozess und Einstellungen bewertet oder unbewertet geführt werden. Aus E oder Q lässt sich keine pauschale Buchung auf ein Projekt-Aktivkonto ableiten. [3](#source-3) [4](#source-4)

## Konsignation: Wareneingang, Übernahme und Verbrauch trennen

Bei Lieferantenkonsignation bleibt das Material zunächst Eigentum des Lieferanten. Im Standardprozess wird eine Bestellposition mit Positionstyp K verwendet. Der Wareneingang zur Konsignationsbestellung erfolgt mit **101 K** und erhöht den Konsignationsbestand; er bewertet diesen nicht als eigenen Bestand. Der Konsignationsinfosatz enthält den Preis für die spätere Entnahme beziehungsweise Übernahme. [5](#source-5) [8](#source-8)

**411 K** ist die Umbuchung aus frei verwendbarem Lieferantenkonsignationsbestand in eigenen frei verwendbaren Bestand. Sie ist weder der Wareneingang vom Lieferanten noch die direkte Entnahme auf eine Kostenstelle. Der Wert wird auf das Bestandskonto und gegen die Konsignationsverbindlichkeit gebucht; bei abweichender Bewertung können weitere Buchungszeilen entstehen. Eine zusätzliche 561-Buchung ist kein Bestandteil dieser Eigentumsübernahme. [6](#source-6) [7](#source-7)

Direkter Verbrauch und Übernahme in eigenen Bestand sind unterschiedliche Vorgänge. Die aus Entnahmen oder Übernahmen entstandenen Verbindlichkeiten werden im klassischen Prozess über **MRKO** abgerechnet. Die Konsignationsbestellposition wird nicht wie eine normale Bestellrechnung über MIRO abgerechnet. [5](#source-5)

## Ein Mengenbeispiel zum Prüfen

Angenommen, 100 Stück liegen im frei verwendbaren K-Bestand. Nach einer Übernahme von 20 Stück mit 411 K werden 80 Stück als K-Bestand und 20 Stück als eigener Bestand erwartet. Die physische Gesamtmenge bleibt 100. Das ist ein abgeleitetes Lernbeispiel, kein protokollierter Systemtest.

Vor einem Test sind mindestens Material, Werk, Lagerort, Lieferant, gültiger Konsignationsinfosatz, Bewertung und Kontenfindung zu prüfen. In einem freigegebenen Testmandanten müssen Materialbeleg, Bestandsanzeige, FI-Beleg und anschließende Abrechnung zusammenpassen. Konkrete Kontonummern hängen vom System ab.

## E und Q im Alltag

Für Material zu einer bestimmten Kundenauftragsposition ist E der passende Begriff; für Material zu einem PSP-Element Q. Beim Wareneingang mit Bestellbezug werden die relevanten Zuordnungen aus dem Referenzbeleg übernommen. Eine Umbuchung ist nach Quelle, Ziel und Geschäftsvorgang zu wählen, nicht allein nach einem Buchstaben. Die bisherigen Angaben „412 E als Projekt-Wareneingang“ und „411 E als Projektverbrauch“ waren falsch. [3](#source-3) [1](#source-1)

## Internationale Prozesse und Prüfungsvorbereitung

Dieser Beitrag leitet aus Konsignation keine Steuer- oder Zollbehandlung für Mexiko, Brasilien oder Kolumbien ab. Die früheren pauschalen Aussagen zu IMMEX, IVA, CFDI und angeblich erforderlichen Länderbewegungsarten wurden zurückgenommen. Ein länderspezifisches Design braucht einen gesonderten, belegten Fachreview.

Zum Lernen eignen sich drei Fragen: Wem ist der Bestand zugeordnet? Wird er bewertet? Welchen Geschäftsvorgang bildet die Bewegung ab? Der Beitrag macht keine Aussage über konkrete aktuelle Zertifizierungsfragen oder deren Reihenfolge.

**Prüfstand:** Quellenabgleich am 02.11.2026. Kein SAP-Systemtest durchgeführt. Der genaue Release-, Bewertungs- und Customizingstand muss vor der Anwendung am Zielsystem geprüft werden.
