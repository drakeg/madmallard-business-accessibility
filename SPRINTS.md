# Sprints — Mad Mallard Business Accessibility

See [BACKLOG.md](BACKLOG.md) for ordered work and [RELEASES.md](RELEASES.md) for release gates. Sprint outcomes describe verified development activity, not customer demand.

## Sprint 0 — Local authorized auditing (completed)
**Delivered:** single-site axe-core accessibility scan, manual review, authenticated operator, SQLite persistence, local Docker Compose and owner-authorized target restrictions.
**Acceptance evidence:** repo browser and API tests, local Docker testing documented in `docs/VALIDATION.md`.

## Sprint 1 — SMB agency review MVP (completed)
**Delivered:** admin/customer accounts, profile/token rotation, owner-isolated reports, HTML printout, on-page SEO and HTML-Validate, remediation guidance and dashboard; see merged PRs #4–#8.
**Acceptance evidence:** existing API/browser tests; no real paid pilot validated.

## Sprint 2 — Vercel portability (completed implementation, verification outstanding)
**Delivered:** PR #9 merged, Vercel frontend/backend, managed Turso storage, password sessions, one-time administrator bootstrap, optional API credentials and serverless browser support.
**Outstanding acceptance:** live authorized cloud scan completes, printable report downloads and persists after refresh, customer isolation proven in preview. Deployment READY alone does not meet acceptance.

## Sprint 3 — Reliable hosted audits and repository standards (active)
- [ ] **P0:** Finish interrupted-scan recovery PR #10, live validate failed/retry path and durable reports
- [ ] **P0:** Prove a hosted browser audit end-to-end, including failing cases; fix Chromium/runtime defects
- [x] **P1:** Add read-only scheduled public production API smoke checks (health, DB access, unauthenticated denial) — live test and PR pending
- [x] **P1:** Add standards docs, truthful README badges, project-specific CI, security validation, PR template (review in progress)
- [ ] **P1:** Establish documented LAN-accessible Docker test with volume preservation; confirm on a host

**Acceptance:** both target deployments tested, hosted job terminal states correct, authorization/report regressions passing, badge drift checked in CI.

## Sprint 4 — First customer pilot (planned)
**Goal:** demonstrate three approved-page reports and an agency-ready remediation summary to five owner-authorized prospects (no outreach without permission).
**Acceptance:** one complete demonstration, documented setup and report guide, measured delivery effort; pilot price only a hypothesis until buyer feedback.

## Sprint 5 — Safe multi-page expansion (planned, not approved for arbitrary crawling)
**Goal:** scoped authorized site discovery, bounded request quotas and redirect/DNS revalidation after security review.
**Acceptance:** policy tests prohibit SSRF and cross-customer access; costs and scan duration stay bounded.
