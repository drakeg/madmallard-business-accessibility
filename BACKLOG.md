# Prioritized backlog

Project scope: this repository only. Align changes with [SPRINTS.md](SPRINTS.md). Existing historical backlog remains in [docs/BACKLOG.md](docs/BACKLOG.md) until reconciled.

| Priority | Item | Status | Acceptance criteria |
| --- | --- | --- | --- |
| P0 | Recover interrupted Vercel scans | PR #10 open | Stale running scans become failed; completed records and notes untouched; cloud preview checked |
| P0 | Run authenticated real hosted scan | Ready after #10 | Approved website scanned, results survive reload, printable report downloads, errors are visible |
| P0 | Test report authorization | Ready | One customer cannot retrieve, compare or export another owner's records |
| P1 | Repository standards and verified README badges | In progress | All standards docs, scripts, read-only CI, security audit, valid badge check |
| P1 | LAN Docker smoke and preservation | Planned | Bind address configurable with `BIND_ADDRESS=0.0.0.0`, healthy container and retained named volume; no public exposure |
| P1 | Automated read-only production smoke | In progress | Health, DB status, and authentication guard checked without changing data; GitHub workflow scheduled |
| P1 | Fix Vercel browser launch on heavy sites | Conditional | Reproduced runtime failure repaired and tested, not assumed working |
| P2 | SMB demo and pilot handoff | Planned | Three authorized pages, concise findings and time-to-delivery measurement |
| P2 | Safe site-wide crawl evaluation | Blocked on security review | Fixed scope/quotas, redirect and network guard tests; no unapproved crawling |

Commercial hypothesis: agencies managing small-business websites pay for time-saving prioritized audit reports. The existing $249 pilot estimate is **not** validated revenue, a sales offer, or proof of demand. Prioritize successful scans and useful reporting over feature breadth.
