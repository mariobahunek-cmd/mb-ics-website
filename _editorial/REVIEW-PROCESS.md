# Content release process - 2026-11-02

Owner of subject-matter approval: Mario Bahunek. Independent candidate review: coordination chat “Auditbericht-Fixes planen”. Neither role is considered approved by the presence of this document.

The former publish workflow now produces a read-only inventory. Reactivation, manual dispatch (including dry_run=false), or a legacy MC dispatch cannot move drafts or push commits. There is no promised publication frequency. Reintroducing publication automation is a separate reviewed change.

For every release:
1. Identify both language files, their SHA-256 hashes, sources and system scope. Keep original publication dates; use a truthful content revision date.
2. Resolve factual claims or explicitly withdraw/qualify them. Record unexecuted system scenarios separately from source-verified definitions.
3. Record Mario’s actual subject-matter decision for these exact files (date, evidence reference and hashes). Do not manufacture a signature or mark the present candidate approved.
4. Build and read the rendered DE/EN pages on desktop and mobile. Record screenshots, source-anchor checks and language-link navigation.
5. Obtain independent acceptance of the exact candidate commits through the coordination chat. If content changes, the affected approval is stale and must be renewed.
6. Only then integrate by reviewed merge through the existing GitHub Pages process. A push to main can deploy. No automatic oldest-draft selection or date rewriting is allowed.

Drafts remain under _drafts and are excluded from normal Jekyll builds. Editorial evidence remains under _editorial (underscore directory, not a public page). Existing published content has no retrospective approval inferred from its publication.
