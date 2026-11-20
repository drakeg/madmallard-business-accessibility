# Working agreement
Build only this accessibility audit/review offering. Keep scans authenticated and permission-confirmed; never expose an anonymous arbitrary-URL scanner. Greg authorized optional domain restrictions and explicit local-container mode on November 14, 2026. Keep local testing off by default and preserve metadata blocking. Do not activate paid APIs, cloud deployment, outreach or purchases from build instructions. Keep all findings and customer content out of Git.

Run `npm test` and the real-browser tests with `CHROMIUM_PATH` set before marking a release ready. Record environmental failures honestly. Docker/Compose and cloud API/schema validation are distinct checks. Keep a single runtime replica until SQLite and in-process jobs are replaced. Keep dependency lockfile and notices. Update README and deployment requirements with behavior changes. Demand evidence must stay separate from engineering status. Link this repo in the portfolio hub and apply `madmallard-business` topic.

Greg authorized administrator/customer accounts, per-account profile/API-token rotation and customer-owned scan access on November 14, 2026. Customer scan access is read-only and must be enforced in every API route, including export/compare. Do not publish or invite customers from a local build instruction. Preserve the database and test cross-account access before shipping authorization changes.


## Mad Mallard Development Standards (repository-specific adoption)

Follow the [centralized repository standards](https://github.com/drakeg/madmallard-repository-standards) when compatible with this product; its toolkit is an adoption guide, not permission to modify or inspect other applications. Preserve the security and user consent requirements above.

Operate in short loops: build, test, deploy to disposable preview, test real authenticated workflows, repair, redeploy, continue with the next ready backlog item. Keep [SPRINTS.md](SPRINTS.md), [BACKLOG.md](BACKLOG.md), [CONTRIBUTING.md](CONTRIBUTING.md), [RELEASES.md](RELEASES.md), and [SECURITY.md](SECURITY.md) current in each relevant PR. Prioritize validated SMB value, not invented revenue or outreach. Include PR link, exact tests, deployment status, outstanding blockers and next backlog item in handoffs. Never claim an unverified live scan passed.

The README badges immediately below the title are maintained using `scripts/badges.py` (adapted from the centralized toolkit). Inspect manifests, workflows, deployment config, licensing and release state before editing. Run `python3 scripts/badges.py --repo . --mode check` and the Python regression tests, including in CI. Do not hardcode green build/security status or fabricate an open-source license, released version or provider support. Keep the dynamic CI/security, issue and PR badges linked to the corresponding GitHub pages. Make normal README badge updates part of the same PR as technology changes.

Use repository branches and reviewable PRs; honor branch protections, required reviewers and authorized production release decisions. Keep local Docker volume data and Turso histories separate and preserved. Docker Compose supports LAN binding via `BIND_ADDRESS=0.0.0.0`, but network users should only reach a trusted LAN; do not expose insecure local-only mode publicly. Paid cloud changes and customer outreach require separate approval.
