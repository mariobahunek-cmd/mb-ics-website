# SAP MM Workshop Landing Page

Lead-Magnet-Page für den **C_TS452_2601**-Crash-Course. Visuell und URL-mäßig
getrennt von der mb-ics Consulting-Brand, läuft auf gleicher Domain.

## Wo liegt was

| Pfad | Zweck |
|---|---|
| `/sap-mm-workshop/index.html` | Die Page. Standalone HTML mit Tailwind-CDN, kein Layout-Inheritance. |
| `/sitemap.xml` | Enthält die neue URL (statisch eingetragen, Liquid-Template). |

Live unter: `https://mb-ics.com/sap-mm-workshop/`

## Architektur-Entscheidungen

- **Subpath, keine Subdomain.** Domain-Authority mitnehmen, kein DNS-Setup.
- **Kein Jekyll-Layout.** Datei hat kein YAML-Frontmatter → Jekyll behandelt
  sie als Static File und kopiert sie unverändert. Damit kein Header/Footer
  der Consulting-Brand und kein `style.css`-Durchschlag.
- **Tailwind CDN** statt Build-Pipeline, weil der Rest der Site kein Tailwind
  hat und ein zweites Build-Setup für eine einzelne Landing-Page Overkill ist.
  Performance-Hinweis: Tailwind CDN warnt in der Konsole, dass es für
  Produktion nicht gedacht ist — für eine Lead-Magnet-Page mit niedrigem
  Traffic akzeptabel.
- **Nicht in der Hauptnavigation verlinkt.** Bewusst — Traffic kommt von
  LinkedIn/YouTube/Google, nicht von der Consulting-Site.

## Email-Provider: Brevo

Lead-Capture geht an einen Brevo-Hosted-Form-Endpoint. Der Endpoint ist im
JS ganz oben als `BREVO_FORM_URL` definiert.

### Setup (einmalig durch Mario)

1. Brevo Dashboard → **Contacts → Forms → Create form**.
2. Felder anlegen, die zur Form-Page passen:
   - `EMAIL` (Standard)
   - `FIRSTNAME` (Standard)
   - `COUNTRY` (Standard-Attribut anlegen, Typ Text)
   - `LEARNING_HUB` (Custom-Attribut, Typ Text, Werte: `hub-yes`, `hub-soon`, `hub-no`)
   - `LANG` (Custom-Attribut, Typ Text, Werte: `en`, `es`)
   - `SOURCE` (Custom-Attribut, Typ Text — alle Leads von dieser Page haben `sap-mm-workshop-landing`)
3. Double-Opt-in **aktivieren** (Brevo → Settings → DOI-Template anlegen).
4. Auto-Responder-Email konfigurieren: PDF als Anhang, Trigger = "neuer
   Kontakt in Liste X". Inhalt EN/ES je nach `LANG`-Attribut (Brevo
   unterstützt bedingte Inhalte mit `{% if contact.LANG == "es" %}...{% endif %}`).
5. **Form embeddable code** kopieren → Action-URL extrahieren (sieht aus
   wie `https://sibforms.com/serve/MUIEA...`).
6. Diesen Wert in `/sap-mm-workshop/index.html` einsetzen:
   ```js
   const BREVO_FORM_URL = 'https://sibforms.com/serve/MUIEA...';
   ```

Bis dieser Schritt erledigt ist, blendet das Formular nur den Thank-You-Block
ein und loggt das Lead-Payload in die Console — der Lead geht verloren.

## Wie eine zweite Page für SD (C_TS462) ableiten

1. Ordner `sap-sd-workshop/` neben `sap-mm-workshop/` anlegen.
2. `index.html` kopieren.
3. Suchen und ersetzen:
   - `C_TS452_2601` → `C_TS462_2601` (Exam-Code; den finalen SD-Code prüfen,
     SAP nummeriert die System-Based-Exams parallel)
   - `MM` → `SD` (im Titel, in Section-Headlines, im Brand "SAP MM Exam Lab")
   - `procurement` → `sales`, `purchase order` → `sales order` etc. im
     englischen Body
   - `compras` → `ventas`, `pedido de compra` → `pedido de venta` im spanischen Body
4. SEO-Tags anpassen: `<title>`, `<meta name="description">`, OG-Title/Description,
   canonical URL auf `/sap-sd-workshop/`.
5. Sitemap erweitern (`sitemap.xml` → neuen `<url>`-Block hinzufügen).
6. Eigene Brevo-Form anlegen mit `SOURCE = 'sap-sd-workshop-landing'`, damit
   die Lead-Quellen sauber trennbar bleiben.

## Sprach-Variante erweitern (z. B. PT)

Aktuell EN/ES via `data-lang-en` / `data-lang-es` und Body-Klassen `lang-en` /
`lang-es`. Für eine dritte Sprache:

1. Im CSS-`<style>`-Block: `[data-lang-pt] { display: none; }` und
   `body.lang-pt [data-lang-pt] { display: revert; }` ergänzen.
2. Im Header-Toggle einen `PT`-Button mit `onclick="setLang('pt')"` hinzufügen.
3. Jeden EN/ES-Block-Paar um einen `<span data-lang-pt>...</span>` ergänzen.
4. In den Form-Inputs `data-placeholder-pt="..."` ergänzen.
5. Im Auto-Detect-Block unten: `else if (... .startsWith('pt')) setLang('pt')`.
6. Im `<head>`: `<link rel="alternate" hreflang="pt" href="..." />` ergänzen
   (nur wenn eine eigene URL für PT angelegt wird; bei dieser Single-Page-
   Variante mit Sprach-Toggle technisch nicht streng nötig, aber gut für SEO).

## Cookie-Banner & DSGVO

- Banner ist inline in der Page, nutzt den gleichen `localStorage`-Key
  `cookieConsent` wie die Hauptsite — wer auf `mb-ics.com` schon akzeptiert
  hat, sieht den Banner auf `/sap-mm-workshop/` nicht mehr (und umgekehrt).
- Die Page lädt **keine** Analytics, **kein** YouTube (Video ist Placeholder).
  Tailwind CDN ist die einzige Third-Party-Ressource → Hinweis im Banner.
  Sobald ein YouTube-Embed eingebaut wird, muss der Banner-Text angepasst
  werden (analog zur Hauptsite).

## Was die Page nicht macht (bewusst)

- Kein Analytics. Wenn das später nachgerüstet wird, separater Tag/Stream
  vom Consulting-Hauptsite-Tracking, damit Workshop-Conversions sauber
  isoliert reportbar sind.
- Keine Preise, keine Buy-Buttons, keine Testimonials. Phase 1 = Email-
  Capture. Sales-CTA für Mini-Workshop und Cohort folgt in eigener Page,
  wenn Liste qualifiziert ist.
- Keine erfundenen Daten in Trainer-Bio und FAQ. `[Your name]`, `[X] years`,
  `[Exam date]` sind Platzhalter, die Mario manuell füllt, sobald er die
  Page tatsächlich öffentlich macht.
