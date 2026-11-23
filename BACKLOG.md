# Prioritized backlog

Project scope: this repository only. Align changes with [SPRINTS.md](SPRINTS.md). Existing historical backlog remains in [docs/BACKLOG.md](docs/BACKLOG.md) until reconciled.

| Priority | Item | Status | Acceptance criteria |
| --- | --- | --- | --- |
| P0 | Recover interrupted Vercel scans | Merged PR #10; terminal-write race protection in progress; live validation pending | Stale running scans become failed; completed records and notes untouched; cloud preview checked |
| P0 | Run authenticated real hosted scan | Production first-admin setup outstanding; persisted job integration added | Approved website scanned, results survive reload, printable report downloads, errors are visible |
| P0 | Test report authorization | Test PR in progress; live proof pending | Automated customer-isolation tests reject unrelated report/detail/export/compare and all customer writes |
| P1 | Repository standards and verified README badges | Merged PR #11 | All standards docs, scripts, read-only CI, security audit, valid badge check |
| P1 | LAN Docker smoke and preservation | Planned | Bind address configurable with `BIND_ADDRESS=0.0.0.0`, healthy container and retained named volume; no public exposure |
| P1 | Automated read-only production smoke | Merged PR #12; setup-readiness warning extension in progress | Health, DB status, and authentication guard checked without changing data; GitHub workflow scheduled |
| P1 | Verify packaged serverless Chromium on Linux | CI test in progress | Actual @sparticuz/chromium launches and completes axe/SEO on an authorized loopback fixture; Vercel live scan still separate |
| P1 | Fix Vercel browser launch on heavy sites | Conditional | Reproduced runtime failure repaired and tested, not assumed working |
| P2 | SMB demo and pilot handoff | Planned | Three authorized pages, concise findings and time-to-delivery measurement |
| P2 | Safe site-wide crawl evaluation | Blocked on security review | Fixed scope/quotas, redirect and network guard tests; no unapproved crawling |

Commercial hypothesis: agencies managing small-business websites pay for time-saving prioritized audit reports. The existing $249 pilot estimate is **not** validated revenue, a sales offer, or proof of demand. Prioritize successful scans and useful reporting over feature breadth.

## Community readiness (2026-11-19)

- [x] Configure Discussions welcome topic and confirm standard question/idea/announcement categories ([#14](https://github.com/drakeg/madmallard-business-accessibility/discussions/14))
- [x] Prepare six versioned Wiki source pages and publication checklist without changing repository visibility
- [ ] Enable live GitHub Wiki after explicit public visibility approval (currently unavailable on private GitHub plan)
- [ ] Complete account-level GitHub Sponsors enrollment and validate destination before adding `.github/FUNDING.yml`
- [ ] Perform secrets, history, customer-data and open-source license review before any public release
