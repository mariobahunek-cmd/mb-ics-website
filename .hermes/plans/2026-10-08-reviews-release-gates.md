# Owner addendum: Reviews overnight release gates

Mario requests high-quality completed version by morning 9 October 2026 (America/Recife), not a first draft. Scheduled start01:00. Implementer plus separate independent review instances. Prefer explicit `gpt-6-astra` on OpenAI Codex; verify actual run metadata, no silent fallback. Codex CLI 0.153.4 and ChatGPT login verified Oct8; PATH must include /Users/hermes/.hermes/node/bin and /Users/hermes/.local/bin for durable PTY launch. Calling it Coding Konrad is optional persona, not permission to modify another profile.

## Gates
1. Implement complete working vertical slice in isolated worktree following main plan.
2. Fresh reviewer A: requirements/UI behavior and actual diff, no self-review-only acceptance.
3. Fresh reviewer B: authentication/authorization, abuse, XSS, PII, tokens, statistics, concurrency and deletion/cache behavior.
4. Browser QA desktop/mobile, keyboard accessibility, submission → verification → moderation → public display → withdrawal. Verify persistence, not just screenshots. Local adapters must be labeled; real delivery not fabricated.
5. Fix blockers and rerun tests/reviews on actual final version. Preserve failing output and final output. A reviewer PASS is evidence only with substantive checks, not a release guarantee by itself.
6. Morning report: actual model, branch/worktree/commit, runnable preview, commands/results, review verdicts, remaining production infra dependencies. No invented readiness.

## Durable orchestration
Cron runtime is short. Launch a single durable background runner whose lifecycle contains implementation, separate reviewer invocations, repair cycles and final report. Use supported terminal background/notify; do not leave cron-scoped delegate children. Persist status/logs and task pointer so restart loses no progress. Account for PATH. If model unavailable or infra insufficient, report exact blocker; do not lower standards or bypass approvals.

## Scope
- All historical ProvenExpert reviews are intended for later migration; tonight implement import path only, not data takeover.
- Final deliverable is tested release-ready preview, not authorized production deployment. No main merge/deploy or chargeable services without separate concrete authorization.
- Existing website, data, contacts and unrelated agents untouched.
