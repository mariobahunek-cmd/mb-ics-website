# TRUST68 bounded archive / public source-link boundary

This patch is local only. It does not authorize deployment or claim live MC acceptance.

## Archive publication and withdrawal

The static Jekyll HTML deliberately emits no historical archive quote/name cards. A build-time registry snapshot would become stale after withdrawal; CSS hiding would still disclose the bodies in no-JS/source HTML. Instead the no-JS page explains the limitation and retains navigation to reviews/external profiles. Native published reviews and the historical canonical list remain available; no datastore rows or existing consents are changed by this frontend fix.

The hydrated archive calls the canonical `/v1/historical/identities` registry with credentials omitted and no-store on initialization, language refresh and load-more. It clears any old/SSR cards before awaiting authority. Missing script, timeout, failed HTTP or malformed alias schema leaves the archive empty, with unavailable status. A request epoch prevents a late response from overwriting a newer result. Reload and language routes make fresh requests; no localStorage or stale registry fallback is used.

Only an explicitly reviewed registry alias suppresses a cross-source equivalent. `homepage_id` may explicitly identify a local record. Otherwise `ReviewArchive.identity` computes an exact archive-record fingerprint over a fixed field ordering (source, name, initials, all DE/EN/ES role/quote variants); this is independent of UI language and array position. It is not a person identifier, name similarity matcher, or an equivalence decision. Unlinked records remain, and only identical record fingerprints are deduplicated.

Limits: there is no continuous background polling or remote erasure of previously downloaded assets/content. An already open, idle document can retain its previously authorized rendering until a new archive action/document reload. Static JS archive originals remain the existing source asset; this change enforces public card rendering, not retroactive deletion from browser caches. Static HTML must not be reintroduced without current server-side publication authority. Registry outage hides even unlinked archive cards because it cannot establish which are safe; native review endpoints are unaffected.

## Safe source-link DTO

Only LinkedIn provenance with both authorized-import and deliberate manual-publication rights evidence on the same approved digest can project links. The public fields are `recommendation_url?: string` and `profile_url?: string`, already consumed by `sourceLink` in the actual historical renderer. The private provenance JSON, permission reference, relationship, source/platform IDs and approval evidence never cross this DTO.

An explicit exact permalink kind permits a safe exact recommendation/post path; an explicit profile kind permits a profile path and retains the honest 'not the exact recommendation' label. URLs must be HTTPS, LinkedIn-host allowlisted, have no credentials, port, query or fragment, and match the declared path category. Missing/unsafe/unknown metadata stays missing rather than inventing evidence. The optional exact `source_permalink` may fall back to the reviewed `source_url`, never to an arbitrary inferred profile.

## MC malformed-command integrity

Canonical moderation rejects any non-primitive/non-enum decision before receipt lookup or branching. Rejection requires a primitive objective allowlisted reason; any supplied nonempty publish reason must satisfy that same primitive allowlist. The native UI's empty primitive publish reason is accepted as no rejection reason. Owner, MFA, CSRF, origin, version and idempotency protections remain unchanged. The real signed-OIDC/fresh-process MC regression now sends malformed commands over the actual localhost canonical HTTP server and verifies HTTP400 plus unchanged full review row, audit rows, decision receipts and MC detail readback for each negative case. Valid publish/reject/replay/withdraw/logout remain in that same regression.
