# Strategy-Dokumente — mb-ics Blog

Dieser Ordner ist **privat** — Jekyll publiziert ihn nicht (Eintrag `exclude: [_strategy/]` in `_config.yml`). Inhalte hier sind Marios interne Strategie-Notizen und der Redaktionsplan.

## Inhalt

- [`BLOG_PLAN.md`](./BLOG_PLAN.md) — 26-Wochen-Redaktionsplan, Themen, Bridge-Konzept
- [`REVIEW_PIPELINE.md`](./REVIEW_PIPELINE.md) — 5-stufiger Qualitätsprozess

## Workflow

1. Mario öffnet eine neue Claude-Session, wenn ein Post fällig ist
2. Claude liest `BLOG_PLAN.md`, nimmt nächsten offenen Themen-Slot
3. Claude durchläuft die 5 Stufen aus `REVIEW_PIPELINE.md`
4. Mario macht 5-Minuten-Final-Check
5. Bei Daumen rauf: Move aus `_drafts/` nach `_posts/`, Commit, GitHub Pages publiziert automatisch

## Status-Tracking

(Wird gepflegt sobald Posts laufen.)

| Slot | Thema | Status | Datum publiziert |
|------|-------|--------|------------------|
| 01   | Bewertungsklassen + Kontenfindung | open | — |
| 02   | Sonderbestände | open | — |
| 03   | Rechnungsprüfung | open | — |
| ...  | ... | ... | ... |
