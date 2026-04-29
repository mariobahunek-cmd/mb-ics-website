---
layout: post
lang: de
title: "Bewertungsklassen und Kontenfindung in MM — der unterschätzte Hebel bei internationalen Rollouts"
description: "Bewertungsklasse, Kontomodifikation, OBYC: warum die Kontenfindung bei MM-Bewegungen mehr ist als ein Customizing-Detail — und wo internationale Rollouts an dieser Stelle reproduzierbar kippen."
slug: bewertungsklassen-kontenfindung-internationale-rollouts
translation_key: post-001-bewertungsklassen
date: 2026-04-28
keywords: "OBYC, Bewertungsklasse, Kontomodifikation, Kontenfindung, MM Customizing, BSX WRX GBB, Bewertungskreis, ICMS IPI, internationale Rollouts, SAP S/4HANA, TS452"
persona: C
latam_topic: "BR ICMS/IPI-Konten und OBYC-Erweiterung"
reading_time: 9
show_secondary_cta: true
sources:
  - label: "SAP Help Portal — Account Determination (MM, S/4HANA)"
    url: "https://help.sap.com/"
    note: "Suchpfad in der S/4HANA-Hilfe: Materials Management → Valuation and Account Assignment → Account Determination"
  - label: "SAP Customizing IMG-Pfad — T-Codes OMWB / OBYC"
    note: "Materialwirtschaft → Bewertung und Kontierung → Kontenfindung; Bewertungsklassen-Pflege via T-Code OMSK"
  - label: "SAP Help Portal — Localization for Brazil (TAXBRA, NF-e, BR-Steuerkonten)"
    url: "https://help.sap.com/"
    note: "Stand 2026 — vor produktivem Rollout aktuelle Version prüfen"
  - label: "SAP for Me / SAP Support — Note-Suche zu BR-Konten-Findung"
    url: "https://me.sap.com/notes"
    note: "Suchbegriffe: 'Brazil tax account determination', 'TAXBRA account assignment', 'NF-e accounts'. Aktuell gepflegte Notes regelmäßig prüfen — die Customizing-Empfehlungen für BR werden laufend ergänzt."
---

Wenn dir als MM-Berater im Rollout-Projekt plötzlich Tickets aus dem Finance-Team aufschlagen — falsches Konto beim Wareneingang, GR/IR-Saldo läuft auseinander, Inventurdifferenzen verschmieren auf Verbrauchskonten — liegt die Wurzel überraschend oft an derselben Stelle: in der Kontenfindung. Und konkreter: in der Kombination aus Bewertungsklasse und Kontomodifikation.

Dieser Beitrag bricht runter, was OBYC tatsächlich macht, warum die Bewertungsklasse mehr ist als ein Customizing-Feld am Material — und wo internationale Rollouts an dieser Stelle reproduzierbar kippen, besonders bei einem brasilianischen Buchungskreis.

## Was Bewertungsklasse und Kontomodifikation tatsächlich tun

Die Bewertungsklasse wird am Material im Buchhaltungs-View gepflegt. Sie ist die Klassifizierung, mit der das Material in das Konten-Findungs-Schema einsortiert wird — Rohstoffe, Halbfabrikate, Fertigerzeugnisse, Handelsware werden in der Regel über unterschiedliche Bewertungsklassen geführt, weil sie unterschiedlich in der Bilanz auftauchen sollen.

Die Kontomodifikation kommt aus der Bewegungsart und beschreibt, was bei dieser konkreten Bewegung auf der Buchhaltungsseite passieren soll: Verbrauch in eine Kostenstelle, Lieferanten-Rückgabe, Inventurdifferenz. Die Bewegungsart trägt also die Information, *was* gebucht wird; die Bewertungsklasse, *welche Materialgruppe* es betrifft.

OBYC ist der T-Code, der diese beiden Achsen zusammenführt. Pro Vorgang (z. B. BSX), pro Bewertungskreis, pro Bewertungsklasse, pro Kontomodifikation hinterlegst du ein Konto. Klingt nach trivialer Tabellenarbeit — wird in Konzernen mit dutzenden Werken über mehrere Länder schnell unübersichtlich, und dort entstehen die Rollout-Tickets.

## Die zentralen OBYC-Vorgänge — die Kurzliste, die im Alltag wirklich begegnet

Es gibt deutlich mehr Vorgänge als die fünf, mit denen du im Tagesgeschäft zu tun hast. Wenn ein Ticket aus dem Finance reinkommt, ist die erste Frage „mit welchem Vorgang hat es zu tun" meistens schon die halbe Diagnose.

| Vorgang | Wofür | Wann er relevant wird |
|---------|-------|----------------------|
| BSX     | Bestandskonto | Jede Wertveränderung am Bestand: Wareneingang, Storno, Bewertungsänderung |
| WRX     | GR/IR-Verrechnungskonto | Wareneingang plus Rechnungseingang — das klassische Belegtyp-Pärchen |
| GBB     | Gegenbuchung Bestand | Verbrauch, Inventurdifferenzen, Verschrottung, Bestand ohne Bestellung — splittet sich über die Kontomodifikation in mehrere Unterfälle |
| PRD     | Preisdifferenzen | Differenz zwischen Bestellpreis und Bewertungspreis bei S-Material |
| KDM     | Kursdifferenzen Material | Wechselkurs-Differenz zwischen Wareneingang und Rechnungseingang |
| KBS     | Konten aus Kontierung | Direkt-kontierte Bestellungen (Kostenstelle, Auftrag) — wichtige Ergänzung zu GBB |

Das praktisch wichtigste Detail: **GBB ist nicht ein Konto, sondern eine ganze Familie.** Über die Kontomodifikation wird er aufgesplittet — VBR für Verbrauchsbuchungen, BSA für die Bestandsaufnahme-Buchungen (z. B. Bewegungsart 561), INV für Inventurdifferenzen, ZOB für Wareneingang ohne Bestellung, VNG für Verschrottung. Wenn der Kollege aus dem Controlling fragt, warum eine Inventurdifferenz auf einem Verbrauchskonto landet, sitzt der Fehler praktisch immer im GBB-Block der OBYC.

## Bewertungskreis — die Ebene, die viele übersehen

In der Bewertungsebene-Pflege wird festgelegt, ob der Bewertungskreis auf Werks- oder auf Buchungskreis-Ebene liegt. Diese Entscheidung ist nicht nur ein technisches Setup — sie definiert, auf welcher Ebene OBYC-Findungen aufgelöst werden.

In Multi-Plant-Setups, in denen verschiedene Werke unterschiedliche Konten brauchen (z. B. weil ein Werk Produktion ist und ein anderes ein reines Distributionslager), ist „Bewertungskreis = Werk" praktisch Pflicht. In schlanken Setups mit homogener Kontenlogik genügt „Bewertungskreis = Buchungskreis".

**Praxis-Hinweis:** Diese Entscheidung ist nach produktivem Live-Gang nur mit erheblichem Aufwand reversibel. Bei Greenfield-Rollouts gehört sie auf den ersten Block der Architektur-Workshops, nicht in den Customizing-Sprint des Build-Teams.

## Wo internationale Rollouts an dieser Stelle kippen

Drei Muster, die in Multi-Country-Projekten reproduzierbar Probleme erzeugen — nicht spektakuläre Bugs, sondern langsam wachsende Reporting-Drift, die erst beim ersten Quartalsabschluss aus dem Ziel-Land sichtbar wird.

**1. Lokale Konten existieren im operationalen Kontenplan nicht.** OBYC verlangt, dass das Konto im operationalen Chart of Accounts des Buchungskreises existiert. Wenn der COA aus DACH stammt und ein Tochter-Buchungskreis Bedarf an Konten hat, die der HQ-COA gar nicht kennt, knallt es beim ersten Wareneingang. Lösung: lokale Konten im operationalen COA anlegen — auch wenn HQ sie selbst nie bebucht.

**2. Bewertungsklassen werden 1:1 aus dem HQ-Template übernommen, ohne lokale Ausnahmen.** In bestimmten Ländern brauchen Materialien spezifische Bewertungsklassen wegen lokaler steuerlicher Anforderungen oder Reporting-Vorgaben. Wer das Template ohne Anpassung übernimmt, baut Reporting-Drift ein, die später nur über eine Bewertungsklassen-Umstellung am Material reparierbar ist — eine im Produktivsystem aufwendige Aktion, weil sie an Bestand, Wert und Buchungssätzen gleichzeitig zieht.

**3. Bewegungsarten werden nicht lokal erweitert.** Die SAP-Standard-Bewegungsarten reichen für DACH-Setups in den meisten Fällen aus. Für Buchungskreise in Brasilien, Mexiko oder Kolumbien werden in der Regel kundeneigene Bewegungsarten (Y- oder Z-Range) gebraucht, weil bestimmte Sonderbuchungen nur lokal vorkommen. Diese kundeneigenen Bewegungsarten brauchen ihre eigene Kontomodifikation in OBYC — sonst verschmieren Sonderbuchungen mit Standard-Vorgängen auf demselben Konto, und das Reporting wird unbrauchbar.

<aside class="latam-bridge">

<div class="latam-bridge__head">Internationaler Ausblick — Brasilien</div>

### ICMS/IPI auf OBYC: warum die Standard-Findung allein nicht reicht

In Brasilien sind ICMS (Imposto sobre Circulação de Mercadorias e Serviços) und IPI (Imposto sobre Produtos Industrializados) keine Steuern, die rein im FI-Buchungssatz mitlaufen — sie sind, abhängig von der Steuersituation der Bewegung, teilweise erstattungsfähig. Heißt konkret: Eine Wareneingangs-Buchung in einem brasilianischen Buchungskreis muss nicht nur das Bestandskonto bebuchen, sondern parallel separate Konten für ICMS-Verrechnung, IPI-Verrechnung sowie ggf. PIS/COFINS-Anteile.

Standard-OBYC liefert die Hooks dafür über zusätzliche Vorgänge, die in der **brasilianischen Localization** zur Standard-Konten-Findung hinzukommen. Das **Steuerschema TAXBRA** ist die zentrale Stelle, an der die Steuersituation einer Bewegung ausgerechnet wird. Auf Basis von NCM-Code, Steuerklassifizierung des Materials und Steuersituation des Lieferanten löst die Localization-Logik dann die finalen Konten auf — typischerweise mehrere Konten pro Buchungssatz.

**Drei Stellen, an denen das in der Praxis kippt:**

- **Vorgänge fehlen im OBYC-Schema.** Wer aus einem nicht-BR-Template kommt und Vorgänge nur mit DACH-Kontomodifikationen pflegt, bekommt für ICMS-relevante Verbrauchsbuchungen keinen vollständigen Buchungssatz.
- **NCM ist am Material nicht gepflegt.** Ohne NCM-Code (Nomenclatura Comum do Mercosul) am Material läuft die Localization-Logik in einen Default — und der trifft selten das richtige Konto.
- **Steuersituation ist nicht sauber zugeordnet.** Lieferanten in Brasilien brauchen eine spezifische Steuersituation (CFOP-Logik), die zusammen mit Bewegungsart und Bewertungsklasse die finale Konten-Auflösung treibt.

Das ist nicht „etwas mehr Konfiguration" oben drauf — das ist eine zweite Logik-Schicht über OBYC, die wenn sie übersehen wird den NF-e-Output und damit die SEFAZ-Meldung kaputt macht. Vor produktivem Go-Live in Brasilien gehört die Konten-Findung in einen eigenen Test-Track, nicht in den Sammel-Test der MM-Bewegungen.

</aside>

{% include disclaimer-latam.html sources="SAP Help Portal (Localization for Brazil), TAXBRA-Customizing-Pfad, SAP Notes zur BR-Konten-Findung." %}

## Wie man eine misslungene Kontenfindung debugt

Eine Werkzeug-Sequenz, die im Tagesgeschäft schnell zur Wurzel kommt:

1. **Bewegung simulieren.** Vor dem echten Buchen die Buchungslogik per Simulation prüfen — bei Wareneingängen über die Buchungsmaske selbst, bei kritischen Sonderfällen über T-Code MB1A im Simulationsmodus. Die Simulation zeigt den FI-Beleg, den die Buchung produzieren würde.
2. **OBYC im Read-Modus aufmachen** und für den problematischen Vorgang plus Bewertungsklasse plus Kontomodifikation den Eintrag direkt nachsehen. Gibt es überhaupt einen Eintrag? Stimmt das Konto?
3. **Material-Master prüfen:** Welche Bewertungsklasse ist im Buchhaltungs-View hinterlegt? In welchem Bewertungskreis?
4. **Bewegungsart-Customizing prüfen:** Ist die Kontomodifikation, die die Bewegungsart liefern sollte, in OBYC für diese Vorgang/Bewertungsklasse-Kombination gepflegt?
5. **Bei BR-Setups zusätzlich:** NCM am Material, Steuersituation am Lieferanten, Steuerschema-Findung über TAXBRA prüfen.

In 80 % der Fälle liegt der Fehler in einem fehlenden OBYC-Eintrag oder einer falsch gepflegten Bewertungsklasse am Material. Die restlichen 20 % verteilen sich auf Bewertungskreis-Verwirrung und Localization-spezifische Sonderfälle.

## Worauf es im Klausur-Kontext (TS452) ankommt

Die Examen-Fragen zu diesem Bereich gehen selten in die Tiefe der Localization. Sie testen aber zuverlässig die Grundlagen: Wer ist verantwortlich für welchen Vorgang (BSX, WRX, GBB)? Wie wird die Kontomodifikation aus der Bewegungsart abgeleitet? Was ist der Unterschied zwischen Bewertungsklasse und Kontomodifikation, und wie spielen sie in OBYC zusammen?

Eine Beobachtung aus der Trainings-Praxis: Wer die OBYC-Vorgänge nur als Liste auswendig lernt, scheitert im Anwendungsfall. Wer dagegen den Buchungssatz für einen Standard-Wareneingang Schritt für Schritt durchgehen kann (Bestandskonto an GR/IR über BSX und WRX, Bewegungsart 101, Standardpreis-Material vs. gleitender Preis, Auswirkung der Bewertungsklasse), hat den Stoff im Griff.

## Praktischer Check vor jedem Rollout

Eine Checkliste, die in einem internationalen MM-Rollout das Schlimmste fängt:

1. **OBYC-Diff** zwischen HQ-Template und Ziel-Buchungskreis ziehen, vor dem ersten Test-Wareneingang. Lücken im COA werden so frühzeitig sichtbar.
2. **Bewegungsarten-Inventur:** Welche Z-/Y-Bewegungsarten sind im Ziel-Land geplant? Jede braucht eine Kontomodifikation, die in OBYC für GBB hinterlegt ist.
3. **Bewertungsklasse-Mapping** zwischen Material-Master-Templates und lokalen Anforderungen — speziell für Buchungskreise in BR, MX und CO mit Steuerimplikationen.
4. **Bewertungskreis-Ebene** verifizieren: Werk oder Buchungskreis? Bei Multi-Plant-Multi-Country in der Regel = Werk.
5. **Lokales Tax-Toolkit** auf Aktivierung prüfen — und nicht erst beim ersten echten NF-e oder CFDI merken, dass die Localization noch nicht scharf ist.

OBYC ist eine alte Tabelle. Sie ist nicht spektakulär, sie ist nicht spannend, sie ist nicht das, womit man auf Konferenzen glänzt. Aber sie ist die Stelle, an der internationale MM-Rollouts entweder durchlaufen oder im Quartalsabschluss platzen — und das macht sie zur Pflicht-Lektüre für jeden, der MM in mehr als einem Land aufsetzt.
