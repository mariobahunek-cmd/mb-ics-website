# TRUST68 bounded archive / public source-link boundary

This patch is local only. It does not authorize deployment or claim live MC acceptance.

## Archive publication and withdrawal

The static Jekyll HTML deliberately emits no historical archive quote/name cards. A build-time registry snapshot would become stale after withdrawal; CSS hiding would still disclose the bodies in no-JS/source HTML. Instead the no-JS page explains the limitation and retains navigation to reviews/external profiles. Native published reviews and the historical canonical list remain available; no datastore rows or existing consents are changed by this frontend fix.

The hydrated archive calls the canonical `/v1/historical/identities` registry with credentials omitted and no-store on initialization, language refresh and load-more. It clears any old/SSR cards before awaiting authority. Missing script, timeout, failed HTTP or malformed alias schema leaves the archive empty, with unavailable status. A request epoch prevents a late response from overwriting a newer result. Reload and language routes make fresh requests; no localStorage or stale registry fallback is used.

TRUST68B supersedes the former client-only archive mapping: no old archive names, original bodies or translations are shipped in public JS/HTML/documents. The corporate page’s three copied excerpts are also removed. The original 30 records are inventoried from git object `8279bdfcce6684c90998a1f99416cd7b6cff40ac:testimonials.js` in `docs/trust68b-archive-inventory.json` for audit/scanning only; `docs/` and `_data/` are not emitted as static files. This inventory is never imported into a datastore or read by the public renderer.

The selected LinkedIn section fetches the existing canonical `/v1/historical` pagination, bounded at 1,000 public records (otherwise unavailable), and filters the distinct canonical DTO by exact `source === 'LinkedIn'`. Deduplication uses only canonical public IDs, never names, ratings, translations or inferred cross-source identity. Only canonical publication provides content; native review ratings do not influence selection. Display name and comment use textContent with original whitespace/language, no invented role/participation, no translation and no stars. The unchanged source-link DTO/renderer distinguishes exact recommendation from profile or unavailable source. Empty/unavailable states keep the separately labelled profile CTA.

Limits: no continuous polling or retroactive erasure of prior browser caches is claimed. New initialization, reload, language and load-more fetch current registry/feed without credentials or caching, clear old cards before awaiting authority and reject malformed/unavailable or inconsistent pagination. Request epochs prevent late success replacing newer withdrawal/outage rendering. Canonical records, consents, aliases, tombstones, API privileges, native review UI and prior source-link/MC protections are unchanged.

## Safe source-link DTO

Only LinkedIn provenance with both authorized-import and deliberate manual-publication rights evidence on the same approved digest can project links. The public fields are `recommendation_url?: string` and `profile_url?: string`, already consumed by `sourceLink` in the actual historical renderer. The private provenance JSON, permission reference, relationship, source/platform IDs and approval evidence never cross this DTO.

An explicit exact permalink kind permits a safe exact recommendation/post path; an explicit profile kind permits a profile path and retains the honest 'not the exact recommendation' label. URLs must be HTTPS, LinkedIn-host allowlisted, have no credentials, port, query or fragment, and match the declared path category. Missing/unsafe/unknown metadata stays missing rather than inventing evidence. The optional exact `source_permalink` may fall back to the reviewed `source_url`, never to an arbitrary inferred profile.

## MC malformed-command integrity

Canonical moderation rejects any non-primitive/non-enum decision before receipt lookup or branching. Rejection requires a primitive objective allowlisted reason; any supplied nonempty publish reason must satisfy that same primitive allowlist. The native UI's empty primitive publish reason is accepted as no rejection reason. Owner, MFA, CSRF, origin, version and idempotency protections remain unchanged. The real signed-OIDC/fresh-process MC regression now sends malformed commands over the actual localhost canonical HTTP server and verifies HTTP400 plus unchanged full review row, audit rows, decision receipts and MC detail readback for each negative case. Valid publish/reject/replay/withdraw/logout remain in that same regression.
