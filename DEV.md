# DEV — lokales Setup für mb-ics-website

Dieses Repo ist ein Jekyll-Projekt, das auf GitHub Pages läuft. Live-Builds
passieren serverseitig — diese Anleitung ist nur für **lokale Vorschau**
neuer Posts oder Layout-Änderungen.

## Erst-Setup (einmalig)

System-Ruby auf macOS (2.6) ist zu alt für `github-pages`. Mit `rbenv`
wechselst du pro Verzeichnis auf eine kompatible Ruby-Version.

```bash
# 1. rbenv installieren
brew install rbenv ruby-build

# 2. Shell-Init (einmalig) — bei zsh:
echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc
source ~/.zshrc

# 3. Ruby 3.3.6 installieren (~5 Min)
rbenv install 3.3.6

# 4. Im Repo: Bundle installieren
cd ~/Documents/mb-ics-website
bundle install
```

Die Datei `.ruby-version` im Repo schaltet `rbenv` automatisch auf
3.3.6, sobald du den Ordner betrittst — kein manueller Switch nötig.

## Lokales Preview

```bash
cd ~/Documents/mb-ics-website
bundle exec jekyll serve --drafts --livereload
```

→ http://127.0.0.1:4000

- `--drafts`: rendert auch Files aus `_drafts/` (sonst nur `_posts/`).
- `--livereload`: Browser refresht automatisch bei Datei-Änderungen.

## OG-Image-Cover generieren (einmalig oder bei Design-Änderung)

Wenn `og-cover-home.jpg` oder `og-cover-blog.jpg` aktualisiert werden sollen:

1. Browser auf `og-template.html` bzw. `og-blog-template.html` öffnen
   (z.B. `file://...og-blog-template.html`).
2. DevTools → Device-Mode → Custom-Größe **1200 × 630** setzen.
3. Screenshot des Body-Elements (in Chrome: Cmd-Shift-P → "Capture node
   screenshot" auf `<body>`).
4. Als JPG (Quality ~85) speichern unter:
   - `og-cover-home.jpg` (für Hauptseite — falls gewünscht das aktuelle
     `mario-hero.jpg` im OG-Tag ersetzen)
   - `og-cover-blog.jpg` (für alle Blog-Posts ohne eigenes `image:`-Frontmatter)

## Build-Output prüfen

```bash
bundle exec jekyll build
ls _site/blog/de/
```

Das `_site/`-Verzeichnis ist ge-`.gitignore`-d.

## Tipps

- Bei Permalink-Änderungen: jekyll cleant nicht — `rm -rf _site/` und neu
  bauen, sonst alte URLs noch im Build-Output.
- Bei YAML-Frontmatter-Errors: `bundle exec jekyll build --verbose`
  zeigt die problematische Datei.
- GH-Pages baut serverseitig mit `github-pages` Gem (siehe Gemfile) — das
  pinnt Versionen exakt auf die Live-Umgebung. Lokal also identisch zur
  Live-Site.

## Troubleshooting

| Symptom | Lösung |
|---|---|
| `Bundler::GemNotFound` | `bundle install` neu laufen lassen |
| `Address already in use` (Port 4000) | `lsof -ti:4000 \| xargs kill` |
| Posts erscheinen nicht | `--drafts` Flag fehlt, oder `date:` im Frontmatter ist Future |
| Liquid-Error | Frontmatter-YAML prüfen — Anführungszeichen, Doppelpunkte |
