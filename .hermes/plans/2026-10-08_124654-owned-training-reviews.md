# Eigene Teilnehmerbewertungen auf mb-ics.com — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Teilnehmer geben Mario direkt auf seiner Website Sterne und optional schriftliches Feedback; Interessenten erhalten einen dauerhaften, teilbaren öffentlichen Bewertungslink ohne ProvenExpert-Veröffentlichungslimit.

**Architecture:** Bestehende englisch-first B2B-Jekyll-Website bleibt bestehen. Neue öffentliche Bewertungsseiten und ein schlankes Formular greifen auf einen getrennten, abgesicherten Review-Service zu; bestehende LinkedIn-Testimonials und Evaluationen bleiben getrennte Belegarten. Private Einreichungs-/Verifikationsdaten und öffentliche Bewertungsdaten werden strikt getrennt.

**Tech Stack:** Verifiziert: Jekyll/GitHub Pages, HTML/CSS/Vanilla JS, `_data/i18n_home.json`, `testimonials.js`. Vorschlag für Backend: kleiner Cloudflare Worker + D1, Turnstile und transaktionaler E-Mail-Dienst für Bestätigungslinks; vor Implementierung vorhandene freigegebene Infrastruktur/Kosten prüfen. Kein Hostingwechsel, keine neuen kostenpflichtigen Konten ohne Freigabe.

---

## Auftrag und Grenzen
- Mario beauftragt hier Planung für seinen Programmierer, keine Implementierung oder Produktivveröffentlichung.
- Primärer öffentlicher Link: `https://mb-ics.com/reviews/`; DE `https://mb-ics.com/de/bewertungen/`; ES `https://mb-ics.com/es/opiniones/`.
- Teilnahmeformular `https://mb-ics.com/review/`, Sprachumschaltung; öffentliche und Einreichungs-CTA klar unterscheiden.
- B2B-Schaufenster bleibt englisch-first. Teilnehmerfeedback ist Vertrauensbeleg für Auftraggeber, kein Endanwenderkurs-/Prüfungsprodukt und kein neues Lernportal.
- Die aktuell vorbereiteten Akquise-Mails NICHT auf einen noch nicht existierenden Link umstellen und nicht ungefragt ändern/versenden.

## Geprüfter Istzustand (8. Oktober 2026)
- Beide vom Nutzer gelieferten ProvenExpert-URLs geprüft:
  - https://www.provenexpert.com/mario-bahunek-sap-s4hana-trainer/
  - https://www.provenexpert.com/mario-bahunek-sap-s4hana-trainer/?unpublishedratings=1
- Öffentliche Browseransicht zeigt bei beiden **10 veröffentlicht, insgesamt 38**, folglich **28 unveröffentlicht**. Nicht 28 insgesamt. Nur öffentliche Ansicht geprüft; der Query-Parameter gewährt keinen Zugang zu den unveröffentlichten Texten.
- Kein Login, keine Bezahlung und kein Umgehen der Veröffentlichungsbeschränkung versucht. Die Ursache des konkreten Kontolimits und aktuelle Tarifpreise sind nicht unabhängig geprüft.
- Öffentliche Einzelbewertungen zeigen auch Dezimalwerte (z.B. 4,80 und 4,60). Kein stilles Runden importierter Mehrkriterienwerte auf ganze Sterne.
- Website hat bereits LinkedIn-Zitate in `testimonials.js`, Rendering in `_includes/home.html` ab Bereich `#testimonials`, eigenes ProvenExpert-Siegel/Link. Kontaktformular ist Formspree; das ist kein Review-Speicher oder Review-Backend.
- Website nennt Evaluationsnote 1,07/6, >98% Prüfungsquote und 300+ Teilnehmer. Diese Werte NICHT mit neuem Sterne-Mittelwert oder Review-Zahl verrechnen; vorhandene Statistikbelege sind andere Datensätze.
- Repository `/Users/hermes/projects/mb-ics/mb-ics-website`, origin `https://github.com/mariobahunek-cmd/mb-ics-website.git`. Bei Prüfung sauber. Kein vorhandenes Backend für Review-Erfassung verifiziert.

## Produktentscheidungen für v1
### Teilnehmerfluss
1. Direkten Link öffnen; kein Benutzerkonto nötig.
2. Eine verpflichtende Gesamtwertung 1–5, optional Kommentar (max. 3.000 Zeichen), Kursbereich MM/SD/Grundlagen/Sonstiges, optional Kursmonat. Keine konkreten Prüfungsfragen oder vertraulichen Kundendaten erfragen.
3. Gewünschter öffentlicher Name: Vorname/Initialen oder anonym. Private E-Mail für Bestätigung; nie öffentlich, nicht für Werbung verwenden.
4. Transparente Hinweise: Veröffentlichung freiwillig; Name und Kommentar dürfen nach eigener Auswahl auf dieser Website erscheinen. Getrennte, nicht vorausgewählte Veröffentlichungseinwilligung, Datenschutzhinweis mit Version/Zeitpunkt. Keine Kopplung an Noten/Zertifikate, keine Belohnung für positive Bewertungen.
5. E-Mail-Bestätigung, dann Moderationswarteschlange. Bestätigung bedeutet nur bestätigte E-Mail, nicht bestätigte Kursteilnahme.
6. Erfolgsmeldung benennt den Status korrekt; kein bereits veröffentlicht behaupten. Widerrufs-/Korrekturanfrage ermöglichen.

### Öffentliche Anzeige
- Durchschnitt und Anzahl ausschließlich aus veröffentlichten nativen Bewertungen derselben Skala; Rundung erst in UI. 1–5-Sterne-Verteilung, neueste zuerst, optional kritischste zuerst, paginierte Liste.
- Einträge mit Datum, Kursbereich, optionalem Text und gewähltem Anzeigenamen. Anonyme Rezensionen gleichwertig zählen.
- Bei null veröffentlichten Bewertungen kein erfundener Durchschnitt; klare Empty State.
- Label „Teilnehmerbewertungen auf der Website von Mario Bahunek“; Methodik: Betreiber verwaltet diese Seite, keine unabhängige Bewertungsplattform.
- „Kursteilnahme bestätigt“ nur bei dokumentierter Grundlage, z.B. individuellem Einladungslink nach einem Kurs. Nicht für offene E-Mail-Bestätigung verwenden.
- Bestehende LinkedIn-Zitate separat als Empfehlungen mit Herkunft beibehalten; weder automatisch Sterne vergeben noch in neuen Durchschnitt einbeziehen.
- Originalsprache beibehalten; Übersetzungen erst später und explizit gekennzeichnet. UI EN/DE/ES.
- Ausgewählte Startseitenzitate dürfen kuratiert sein, aber klar als Auswahl mit Link auf vollständige Liste; vollständige Liste nicht nach Positivität filtern.

### Moderation und Vertrauen
- Zustände: `pending_email`, `pending_moderation`, `published`, `rejected`, `withdrawn`.
- Alle Bewertungen unabhängig von Sternezahl nach derselben Regel prüfen. Ablehnung nur nachvollziehbar für Spam, Duplikat, personenbezogene Drittinformationen, rechtswidrigen Inhalt oder fehlenden Trainingsbezug, nicht wegen Kritik.
- Originaltext nicht werblich umschreiben. Redaktionen für persönliche Daten dokumentieren; größere Änderungen beim Verfasser anfragen.
- Admin-Aktionen mit unveränderlichem Audit-Eintrag (wer/wann/Grund). Keine gefälschten Teilnehmer, Sterne oder automatischen Testimonials.
- Admin-MFA, keine öffentlichen Administrator-/Datenbank-Schlüssel, keine schreibbare öffentliche Datenbank.

## Vorhandene ProvenExpert-Bewertungen
- Native Neuerfassung kann unabhängig von einer Migration live gehen.
- Mario kann einen regulären Export oder autorisiert zugängliche eigene Unterlagen bereitstellen. Nicht veröffentlichte Texte nicht über Parameter/API-Tricks freischalten.
- Vor Übernahme Nutzungsrechte, ProvenExpert-Bedingungen und Reichweite der bisherigen Veröffentlichungseinwilligung prüfen; bei unklarer Grundlage neue Einwilligung bzw. erneute Bewertung auf eigener Seite erfragen.
- Importierte Bewertungen deutlich „ursprünglich auf ProvenExpert, übernommen mit Freigabe“, ursprüngliches Datum/Skala/Quelle beibehalten, Importdatum separat; nicht als frische Website-Einreichungen darstellen.
- Altbestand separat darstellen und zählen. Kein gemischter Gesamtwert ohne nachvollziehbare kompatible Skala und dokumentierte Entdoppelung.
- Herkunfts-ID für idempotenten Import; Teilnehmer mit alter und neuer Bewertung nicht als zwei Personen behaupten. Nicht behaupten, die Zahl der Bewertungen entspreche eindeutig der Zahl bewertender Menschen.
- Keine ProvenExpert-Marken-/Siegelkopie als eigenes Verifizierungssiegel. Public outbound source link ist möglich.

## API und Datenvertrag
Öffentlich:
- `POST /v1/reviews`: serverseitige Schema-/Längen-/Sprach-/Sternevalidierung, Abuse-Prüfung, Idempotency-Key, generische Annahmeantwort, kein E-Mail-Existenz-Leak.
- `POST /v1/reviews/confirm`: kurzlebigen Einmal-Token atomar verbrauchen. GET-Link darf nicht durch Mail-Sicherheitsscanner veröffentlichen/verifizieren; Landingpage mit bewusster Bestätigung.
- `GET /v1/reviews?cursor=...&sort=newest`: ausschließlich veröffentlichte Public-DTOs; Cursor stabil, keine versteckten Datensätze/privaten Felder.
- `GET /v1/reviews/summary`: Anzahl/Verteilung/Mittelwert aus derselben veröffentlichen Filtermenge.
Geschützt:
- Admin-Liste, veröffentlichen/ablehnen/zurückziehen, Audit-Lesen. Serverseitige Authentifizierung/Autorisierung pro Aktion.

Datenfelder: UUID, stars INTEGER CHECK 1..5, comment_plaintext, display_name, visibility_choice, course_category, optional course_month, original_language, status, created_at, published_at, consent_version/at, origin, verification_level. Private Tabelle: Review-ID, verschlüsselte E-Mail bzw. DB-Sicherheitsmodell mit separater Zugriffskontrolle, dedupe HMAC (nicht ungesalzenes E-Mail-Hash), token_digest/expiry/consumed_at. ProvenExpert-Import getrennte source_rating/source_scale/source_id/original_date/permission_proof Referenz. Öffentlich keine IP/E-Mail/Token/Consent-Audit ausliefern.

Sicherheitsbaseline: serverseitige Validierung, HTML nur als Text rendern, keine Markdown/HTML-Ausführung, parametrisierte SQL-Abfragen, Rate Limits pro kurzlebigem Privacy-schonendem Schlüssel, Honeypot + Turnstile, Request-Größenlimit, idempotente Einreichungen, Tokens nicht loggen, Origin-Allowlist plus CSRF-Strategie für cookie-basierte Admin-Aktionen. CORS ist kein Authentifizierungsersatz. Bei Backendausfall Kontaktalternative statt verlorener Erfolgsmeldung. Öffentliche Lesedaten cachen und nach Moderation invalidieren.

Datenschutz: Verantwortlichen/Datenschutzhinweis aktualisieren; Auftragsverarbeitung/Region/ggf. internationale Übermittlung für jeden tatsächlichen Dienst vor Go-live prüfen. Löschfristen definieren: unbestätigte Einreichungen z.B. 14 Tage, Missbrauchslogs minimal kurz, veröffentlichte Daten nach nachvollziehbarer Zweck-/Widerrufsregel. Keine gesamte Review-Mailbox in öffentlichen Git-Repos oder Build-Artefakten. Backup mit Restore-Test und ebenfalls Löschkonzept.

## Implementierungsaufgaben (TDD, Preview zuerst)
### Task 1: Datenmodell und Invarianten
Create `services/reviews/migrations/0001_reviews.sql`, `services/reviews/src/schema.ts`, `services/reviews/tests/schema.test.ts`, `services/reviews/package.json`, `services/reviews/tsconfig.json`, `services/reviews/wrangler.toml`.
- Zuerst Tests für Sterne 0/6/Float/NaN, leere/zu lange Texte, Consent fehlt, öffentliche DTO ohne private Felder; Tests müssen rot sein.
- Validator + Migration minimal implementieren; Tests grün. DB-Constraints zusätzlich durch echte lokale SQLite/D1-Integration testen.
- Node Runtime/Worker toolchain stabil und dependency bounds/Lockfile festlegen. Nur hierfür separaten package.json, nicht Website neu bauen.

### Task 2: Einreichung und Bestätigung
Create `services/reviews/src/index.ts`, `services/reviews/src/submit.ts`, `services/reviews/src/confirm.ts`, `services/reviews/src/mail.ts`, `services/reviews/tests/submit.test.ts`, `services/reviews/tests/confirm.test.ts`.
- Rot: Replay, Tokenablauf, doppelter Request, E-Mail-Providerfehler, Rate-Limit, ungeprüfte Einreichung nie öffentlich.
- Minimale Umsetzung; Testmail an ausschließlich freigegebene Testadresse, keine Teilnehmer-Massenmail.
- Bestätigen mit atomarem consume; Mailadapter Testdouble plus realer Staging-Test getrennt ausweisen.

### Task 3: Öffentliche Liste und korrekte Statistik
Create `services/reviews/src/public.ts`, `services/reviews/tests/public.test.ts`.
- Rot: [5,1] veröffentlicht und [5] pending ergibt count2/mean3, nicht count3; withdrawn sofort entfernt; rein historische Zitate nicht mitgezählt; identische Query-Sicht von Liste und Summary; Paging keine Duplikate.
- Implementieren und gegen lokale DB testen. Ungültige Sort-/Cursorwerte ablehnen. Keine personenbezogenen Leaks in Response, Fehlern oder Logs.

### Task 4: Teilnehmerseiten und UI
Create `reviews/index.html`, `de/bewertungen/index.html`, `es/opiniones/index.html`, `review/index.html`, `_includes/reviews.html`, `_includes/review-form.html`, `reviews.js`, `reviews.css`; modify `_data/i18n_home.json` für neue UI-Texte nur soweit bestehende Spracharchitektur genutzt wird.
- Erst Browser-Tests in `tests/reviews/review-form.spec.ts` und `tests/reviews/review-list.spec.ts`: Sterne per Tastatur/Screenreader, Feldfehler, Consent, Lade-/Fehler-/Leerzustand, Filter/Pagination, EN/DE/ES, Mobile.
- Semantische Radio-Buttons 1–5 mit textlichen Labels, nicht fünf unbeschriftete Icons.
- Originalsprache und Herkunft anzeigen; XSS-Payload wörtlich sichtbar, nie ausgeführt.

### Task 5: Geschützte Moderation
Create `services/reviews/src/admin.ts`, `services/reviews/tests/admin.test.ts`, `services/reviews/admin/index.html`, `services/reviews/admin/admin.js`.
- Zuerst Tests: unauthenticated/unauthorized schreibt nie; negative Bewertung darf genau wie positive veröffentlicht werden; Ablehnung verlangt Grund; Audit wird atomar geschrieben; Token/CSRF-Missbrauch blockiert.
- Bestehende zugelassene Auth-Lösung bevorzugen. Neue MFA-Identitäten/Rechte nur durch Owner-Freigabe.
- Ein neutraler Testdatensatz über komplette Statusfolge, dann Staging-Daten bereinigen.

### Task 6: Einbindung und Transparenz
Modify `_includes/home.html` im Testimonials-Bereich, `style.css`, `privacy.html`, `sitemap.xml` (nur falls nicht durch Build generiert), `i18n.js` wenn Sprachrouting es erfordert. Existing `testimonials.js` erhalten, nicht mit Sterne-Backend zusammenzählen.
Create `reviews/methodology/index.html` mit EN/DE/ES-Hinweisen entsprechend Seitenkonzept.
- Startseite: kleiner eigener Sterneblock + „Alle Bewertungen“ + unaufdringliches „Training bewerten“. Keine unbelegten Sterne vor echten Veröffentlichungen.
- ProvenExpert bleibt optionaler externer Nachweis; eigener Review-Link ist neue Hauptdestination nach erfolgreichem Go-live.
- Kein Versprechen von Google-Sternen: selbstverwaltete Unternehmensbewertungen sind nicht automatisch für Review-Rich-Results qualifiziert. v1 ohne eigennützige AggregateRating-Auszeichnung.

### Task 7: Optionaler autorisierter Import
Create erst nach Freigabe `services/reviews/scripts/import-authorized-reviews.ts`, `services/reviews/tests/import.test.ts`.
- Dry-run prüft Quelle, Rechtebeleg, Datumsformat, Originalskala, Duplikate; Bericht vor Schreibfreigabe.
- Import ist idempotent, keine private Exportdatei committen, keine fehlenden Texte/Sterne auffüllen.

### Task 8: Integration, Kosten, Rollback
Create `.github/workflows/reviews-check.yml`, `tests/reviews/playwright.config.ts`, `docs/reviews-operations.md`; modify bestehende `.github/workflows/build-check.yml` nur falls nötig.
- Vorgeschlagene einzurichtende Befehle: `npm --prefix services/reviews ci`; `npm --prefix services/reviews test`; `npm --prefix services/reviews run typecheck`; `bundle exec jekyll build`; Root-Testkonfiguration für `npx playwright test -c tests/reviews/playwright.config.ts` explizit anlegen (Dependencies/Lockfile im gewählten Test-Workspace dokumentieren, nicht aus globalen Paketen erwarten).
- Security-Review getrennt von Implementierung: Stored-XSS, IDOR, Mail-Bombing, Auth, Public-DTO, Logs, Backup/Export, Löschfluss.
- Reale Staging-E2E: Owner-Testbewertung → Mailbestätigung → Moderation → öffentliches Listing/Statistik → Widerruf → Cache/Statistik aktualisiert. Tests nicht als echte Testimonials auf Produktion veröffentlichen.
- Dokumentieren: tatsächlich bestehende Host-Tarife, E-Mail-Limits, Domain/Auth/DMARC, Speicher, Rate-Limits, erwartete Gesamtkosten. Nicht pauschal kostenlos versprechen; Budget ist minimaler laufender Aufwand ohne Review-Anzeigelimit.
- Preview-Link + mobile/Desktop-Screenshots + reale Testausgaben zur Abnahme. Kein Produktivdeploy ohne konkrete Freigabe.
- Rollback: Einreichung schließen/CTA ausblenden, verifizierte Bestandsseite erhalten, DB sichern; keine Rezensionen löschen.

## Abnahmekriterien
- Eigener permanenter Bewertungslink, Teilnehmer können mobil ohne Account 1–5 Sterne + optional Text einreichen.
- Negative und positive Rezensionen technisch gleich behandelt; Moderationsregeln transparent.
- E-Mail und interne Daten nie öffentlich; Einmal-Token/Abuse-Schutz funktionieren.
- Anzahl/Mittelwert/Verteilung exakt reproduzierbar; keine Vermischung mit LinkedIn, Schulnoten oder Altimporten.
- Anbietergrenze 10 entfällt beim eigenen System; Ressourcenlimits transparent, kein künstliches Veröffentlichungslimit.
- Dateneigentum/Export/Backup/Widerruf funktionieren; Nachweis durch reale Staging-Ausführung.
- Design passt zu mb-ics, B2B-Fokus und bestehende Sprache/SEO bleiben erhalten.

## Übergabe
Plan liegt im tatsächlichen Website-Repository. Nächster Schritt für den Programmierer: Hosting-/Mail-Infrastruktur read-only inventarisieren, die v1-Architektur/Kosten bestätigen, dann Tasks 1–6 und 8 umsetzen. Historienimport separat entscheiden; er blockiert nicht die native Neuerfassung. Noch kein Code, Auftrag an externen Programmierer oder Deployment ausgeführt.
