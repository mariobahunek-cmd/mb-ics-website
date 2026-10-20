TRUST-1 local implementation checkpoint

Owner mandate: TRUST-MC-REQUIREMENTS.md, section A, with MC-native moderation explicitly deferred to TRUST-2. No release, social provider extension, OAuth or outbound messages.

Read the workspace TRUST-DISCOVERY.json and TRUST-AUDIT.json before integrating. The underlying COMCAVE report is absent locally; 1.07 is relabeled preparation using the owner mandate and existing preparation submetric, not independently recomputed. All historical figures retain their original values with explicit limitations. Forms are not unique people. Exact recommendation URLs/dates/rights evidence remain unknown, never fabricated.

The new homepage module calls the existing GET /v1/reviews?sort=newest&limit=3 and uses its snapshot summary. Native cards share a textContent-only renderer with the full list; sorting is published_at DESC,id DESC, not star selection. No historical content is inserted into native feedback. The original all-ratings list retains the rating distribution and lowest-rating sort. Browser fixtures intercept all external requests. The review-only build allowlist must include trust-reviews.js; synthetic closure fixtures must include it too.

Verification procedure: focused new DOM fixtures, existing API/DOM/social/auth/recovery tests, pinned Jekyll bundle build with services excluded, one full npm test with 600s cap. Preserve every nonzero log and compare exact failure names with BASELINE.json and FIX66-RESULT.json. Do not describe full tests as clean if they are not. Capture follow-up focused proof independently after any fixture correction.

Trust limits: Email confirmed proves mailbox control only. MC password sessions have no fresh-MFA evidence and cannot be silently converted to a service moderator. MC read-only machine credentials must never expand. The service stays canonical. TRUST-2 needs native list/detail/consent/evidence/history and one deliberate server-authorized publish/reject with fresh MFA, conflict/readback/withdrawal protection and no social dispatch. Reverse-proxy operator-IP ACL must be verified separately; it is not implemented by browser-auth.ts.
