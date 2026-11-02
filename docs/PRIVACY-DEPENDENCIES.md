# Paket 02: Schnittstellen und noch notwendige Betreiberprüfung

Basis: ae64169b6b8969edcce313c1779769835b736b2a. Nur Consent/Kontakt technisch geändert; bestehende Beta- und Bewertungs-Aussagen sind keine in diesem Paket geprüften Infrastrukturbelege.

- **Paket 04 / F08:** Sprachpräferenz derzeit URL-basiert, ohne localStorage. Wird Speicherung implementiert, müssen alle drei privacy-Seiten und Speicherverzeichnis aktualisiert werden. Keine automatische IP-/Sprachumleitung einführen.
- **Paket 01 / F22:** privacy.html Abschnitt participant-reviews und die dort verlinkte Methodik gemeinsam abgleichen. Backend-/Provider-Retention, Veröffentlichung optionaler Zertifikate/Bücher, Widerruf und Backups nach finalem Backendstand belegen. Abschnitt in diesem Paket unverändert erhalten; DE/ES-Hauptwebsitehinweise verlinken die bestehende englische Ergänzung ausdrücklich, sind keine vollständige Übersetzung der fremden Produktmechanik.
- **Paket 03:** Gemeinsame Datei sap-mm-crashcourse/index.html nur Google-Head und Consent-Inlinehandler geändert; Inhalt/Preise/Kapazität unberührt. Bei Integration nur diese Hunks übernehmen.
- **Paket 04/05:** _includes/home.html, _data/i18n_home.json und style.css gemeinsam integrieren; lokale Video-Vorschaubilder bei geändertem Videoangebot aktualisieren. Cookiebanner aus gemeinsamem Include nicht wieder durch alte Kopie ersetzen.
- **Paket 06:** Google-Requests und Cookies nach Widerruf erneut messen, alle Sprachseiten und weiteren Tag-Einstiegspunkte prüfen, Rechts-/Anbieterangaben final abgleichen. Ein bereits geladenes Google-Tag kann Consent-Updates senden. Kein pauschales Versprechen „keine Übermittlung“/„anonym“.

## Speicherentscheidungen im implementierten Kandidaten

Kampagnenzuordnung gilt nur für eine Registerkartensitzung: sessionStorage statt unbegründeter 90-Tage-TTL. Grund: Zuordnung der aktuellen Anfrage, keine besuchsübergreifende Kampagnenhistorie. Reload erhält den Tab-Speicher; Browser-Sitzungswiederherstellung kann ihn verlängern. Kein hypothetisches automatisches Ablaufdatum behauptet. Widerruf löscht sofort, alte lokale Daten werden nicht migriert. Consententscheidungen bleiben localStorage, bis geändert/gelöscht. Alte „all“-Werte werden bewusst nicht als wirksame Zustimmung übernommen (F05).

## Konkrete offene Betreiber-/Rechtsfragen

1. Google-Konto: aktive GA-Property, Enhanced-Measurement-Einstellungen, Datenaufbewahrung, aktivierte Ads-Verknüpfungen und konkret geltende Vertrags-/Transfergrundlagen nachweisen. Kein Zugriff auf diese Kontoeinstellungen in Paket 02.
2. Formspree: Vertragspartei/DPA/SCC, Tarif, Archivfrist/Löschverfahren, Spamfilter, Empfänger, verknüpfte Workflows und Mailbox-Aufbewahrung bestätigen. Die öffentliche Anbieterinformation belegt keinen kundenspezifischen Vertrag. Kontaktformular und Crashcourse nutzen derzeit denselben Endpoint.
3. GitHub: geltende Vertrags-/Transfergrundlage und Hosting-Logfristen; Anbieteradresse/Vertretung der LLC gegen aktuelle Register-/Betreiberunterlagen prüfen. Im bestehenden Impressum steht Fort Lauderdale; keine neue Adresse erfunden.
4. YouTube/Google: Rolle/Vertrag/Transfers für die konkrete Einbindung rechtlich bewerten. Privacy-enhanced mode ist keine Anonymitätsgarantie.
5. Die vorhandenen Beta-/Review-Angaben zu Vercel, Resend, netcup, ZITADEL, Cloudflare und Backblaze einschließlich 1 Stunde/14/30/90 Tage und 6 Monate müssen vom jeweils zuständigen Paket mit aktuellem Produktivstand abgeglichen werden; hier nicht übernommen als eigener Nachweis.
6. Separater Formspree-Testendpoint und ausdrücklich freigegebener Testempfänger fehlen. Keine echte Nachricht versandt. HTTP-Annahme, Providerzustellung und Mailboxeingang getrennt prüfen.
7. Datenschutzrechtliche Gesamtprüfung bleibt offen. Öffentliche Quellen + Funktionstests ersetzen keine Rechtsfreigabe.

## Fortschreibung Paket 04 (02.11.2026)

- Die oben beschriebene rein URL-basierte Sprachwahl ist erweitert: `audience.js` speichert ausschließlich eine ausdrücklich gewählte Sprache (`en`, `de`, `es`) als funktionale Einstellung in `localStorage.mbics_language_v1`. Browserpräferenzen erzeugen höchstens einen Hinweis auf der englischen Startseite. Kein Eintrag beim bloßen Seitenbesuch, keine automatische Umleitung, keine Änderung von Analyse-/Marketing-/Videoeinwilligungen. Direkte URLs gelten weiterhin. Änderung per Sprachlink; Entfernung über die Fußzeile oder Browserdaten. Alle drei Hauptwebsite-Datenschutzhinweise nennen den Schlüssel und die Speicherdauer bis zur Änderung/Löschung.
- Kontakt: Organisation bleibt freiwillig. Thema, Zeitraum, Gruppengröße/Vorkenntnisse, Unterrichtssprache und Format sind zusätzlich freiwillig. Nur erlaubte öffentliche Zweck-/Themenwerte werden in Navigationslinks übertragen; keine freien Formularinhalte. Der freiwillige Mailentwurf enthält die zusätzlichen Angaben. Sämtliche Formspree-Tests sind lokale Fixtures; F25 (Providerzustellung/Mailboxeingang) bleibt NOT_TESTED.
- Die erhaltene `/sap-mm-crashcourse/`-Adresse beschreibt individuelle Vorbereitung ohne feste Dauer, Preis, Gruppengröße oder Termin. Das getrennte Formular hat weiterhin ausschließlich den ausdrücklich bestätigten Zweck „cohort-launch updates“. Land/Situation sind freiwillig; `cohort_updates_consent=yes` wird als zusätzliche ausdrückliche Auswahl übermittelt. Derselbe bestehende Endpoint bleibt. Kein automatischer Versand, keine reale Anmeldung und keine bestätigte Newsletter-/Mailboxzustellung durch die Tests. Vor Live-Betrieb müssen die vorhandenen Provider-Workflows mit dieser Zwecktrennung abgeglichen werden.
- Videos bleiben lokale Vorschaubilder mit gesonderter Videoeinwilligung. EN/ES zeigen kurze vollständige Videos, DE einen aus Kapitelangabe/Transkript gewählten Ausschnitt sowie Zugriff auf das vollständige Video. Release und Aufnahmezeitpunkt sind unbelegt. Automatische YouTube-Untertitel sind keine redigierten Untertitel; die Vollwiedergabe war in der Prüfungsumgebung eingeschränkt.
- Diese Fortschreibung schließt keine der offenen Vertrags-, Aufbewahrungs-, Zustellungs- oder Rechtsfragen aus Paket 02. Die separaten Review-/Beta-Verarbeitungsregeln wurden nicht verändert.

- Das bestehende GA-Ereignis `generate_lead` der Kohorten-Seite bleibt als reine bestätigte Formularannahme erhalten, ausschließlich mit Analyseeinwilligung und dem festen `form_id`. Land, Rolle, Name und E-Mail werden nicht in das Ereignis kopiert. Es zählt weder einen qualifizierten Auftraggeber noch einen Auftrag. Der bisher unkonfigurierte Ads-Platzhalter wird nicht als aktives Conversionziel übernommen.

## R04-01: Textalternativen (02.11.2026)

Für alle drei Unterrichtsproben liegen jetzt unabhängig exportierte automatische Primärtranskripte vor. Die Website enthält fachlich redigierte, zeitcodierte Zusammenfassungen in EN/DE/ES. Diese lokalen Textalternativen sind ohne Player oder Videoeinwilligung erreichbar und werden ausdrücklich nicht als wortgetreue oder synchronisierte Untertitel bezeichnet. Native automatische YouTube-Captions sind bestätigt; vollständige Ton-/Wiedergabequalität bleibt ungeprüft. Es entstehen keine neuen Speicher-, Provider- oder Formulardatenflüsse.
