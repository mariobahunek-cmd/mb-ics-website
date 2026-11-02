---
layout: post
lang: de
title: Bewertungsklassen und automatische Kontenfindung in SAP MM
seo_title: Bewertungsklassen und automatische Kontenfindung in SAP MM
description: Wie Kontenplan, Bewertungsklasse, Bewertung und Kontomodifikation die Kontenfindung beeinflussen.
slug: bewertungsklassen-kontenfindung-internationale-rollouts
permalink: /blog/de/bewertungsklassen-kontenfindung-internationale-rollouts/
translation_key: post-001-bewertungsklassen
date: 2026-04-29
reading_time: 5
author: Mario Bahunek
last_modified_at: '2026-11-02'
system_reference: 'SAP S/4HANA MM. SAP-Learning-Quellen ohne ausgewiesenen Release; die Quelle zur Kontomodifikation nennt Cloud Private Edition. Quellenstand: 02.11.2026.'
review_status: pending_mario_and_independent_review
sources:
- label: 'SAP Learning: Describing Automatic Account Determination'
  url: https://learning.sap.com/courses/cross-functional-customizing-in-sap-s-4hana-materials-management/describing-automatic-account-determination
  note: SAP S/4HANA; edition not specified in lesson title; account-determination factors; No release stated; accessed 2026-11-02.
  edition: SAP S/4HANA; edition not specified in lesson title
  release: null
  version_parameter: null
  version_policy: NO_PUBLISHED_RELEASE
  retrieved: '2026-11-02'
- label: 'SAP Learning: Subdividing a Transaction with the Account Grouping Code'
  url: https://learning.sap.com/courses/exploring-cross-functional-customizing-in-sap-s-4hana-cloud-private-edition/subdividing-a-transaction-with-the-account-grouping-code_b471cc3a-c757-43dd-b0f0-18294f8d7d37
  note: SAP S/4HANA Cloud Private Edition; transaction-specific account grouping; No release stated; accessed 2026-11-02.
  edition: SAP S/4HANA Cloud Private Edition
  release: null
  version_parameter: null
  version_policy: NO_PUBLISHED_RELEASE
  retrieved: '2026-11-02'
---

Bei einer bewertungsrelevanten Warenbewegung muss SAP die passenden Sachkonten ermitteln. Dafür genügt weder die Bewegungsart noch die Bewertungsklasse allein. Entscheidend ist die Kombination der für den jeweiligen Vorgang aktivierten Einflussgrößen. [1](#source-1)

## Welche Angaben zusammenwirken

- **Kontenplan:** Der Buchungskreis bestimmt den relevanten operativen Kontenplan.
- **Bewertungskreis und Bewertungsmodifikation:** Die Bewertungsmodifikation kann Bewertungskreise für die Kontenfindung zusammenfassen oder unterscheiden.
- **Bewertungsklasse:** Sie gruppiert Materialien für die Kontenfindung; sie ist nicht mit der Materialgruppe gleichzusetzen.
- **Vorgangsschlüssel:** Er beschreibt den buchhalterischen Vorgang aus der Wertleiste.
- **Kontomodifikation:** Sie kann einen Vorgang weiter unterteilen, etwa unterschiedliche Verbrauchsfälle.

Welche Kombination benutzt wird, hängt von den Regeln des Vorgangsschlüssels ab. Es gibt deshalb nicht für jeden Vorgang einen zwingenden Eintrag aus allen genannten Merkmalen. [2](#source-2)

## Bestandsbuchung und Gegenbuchung unterscheiden

Ein vereinfachter Wareneingang zu einer Lagerbestellung kann Bestand gegen WE/RE buchen. **BSX** steht dabei für die Bestandsbuchung, **WRX** für WE/RE. **GBB** betrifft Gegenbuchungen zur Bestandsbuchung, zum Beispiel bei bestimmten Verbrauchsvorgängen. **PRD** betrifft Preisdifferenzen. Steuer-, Kontierungs- und Bewertungsfälle können weitere oder andere Zeilen erzeugen. [1](#source-1)

Eine Kontomodifikation ist somit keine universelle Zusatzspalte für jedes Konto. Ihr Einsatz muss zum Vorgang passen. Aus „anderes Land“ folgt auch nicht automatisch „neue Bewegungsart“ oder „neue Bewertungsklasse“. [2](#source-2)

## Einen konkreten Fehler eingrenzen

Für eine nachvollziehbare Analyse im Testsystem:

1. Geschäftsvorgang, Beleg und Fehlermeldung festhalten.
2. Material und tatsächlichen Bewertungskreis prüfen.
3. Kontenplan und Bewertungsklasse ermitteln.
4. Relevanten Vorgangsschlüssel, Regeln und gegebenenfalls Kontomodifikation prüfen.
5. Konteneintrag und Sachkontenstammdaten mit FI abstimmen.
6. Erwartete und tatsächliche Belegzeilen vergleichen.

Das ist eine abgeleitete Prüfreihenfolge, keine Behauptung über die Häufigkeit einzelner Fehler. Die frühere unbelegte 80/20-Aufteilung wurde entfernt. Auch der Verweis auf MB1A als allgemeines S/4HANA-Simulationswerkzeug entfällt.

## Internationale Rollouts

Kontenfindung und länderspezifische Steuerprozesse müssen gemeinsam geprüft werden. Dieser Artikel behauptet keine allgemeingültige Zuordnung von ICMS, IPI oder CFDI zu OBYC. Die früheren Aussagen zu zusätzlichen brasilianischen OBYC-Vorgängen und angeblich notwendigen kundeneigenen Bewegungsarten wurden zurückgenommen. Für ein konkretes Land sind Release, aktivierte Funktionen, Steuerverfahren und lokale Anforderungen gesondert zu belegen.

## Für das Training

Zum Verständnis hilft es, für eine konkrete Warenbewegung jeden Einflussfaktor und jede Belegzeile zu erklären. Das ist keine Zusage über aktuelle Zertifizierungsfragen. **Prüfstand: 02.11.2026; Quellenvergleich, kein SAP-Systemtest.**
