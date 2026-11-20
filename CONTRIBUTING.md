# Contributing

This project is an independent SMB website accessibility/SEO audit product. See [AGENTS.md](AGENTS.md), [SPRINTS.md](SPRINTS.md), [BACKLOG.md](BACKLOG.md), [SECURITY.md](SECURITY.md) and [RELEASES.md](RELEASES.md) before edits.

1. Choose a prioritized backlog item or urgent fix. Develop a focused branch from `main` and submit a PR with the template.
2. Keep credentials, customer reports, audit database and `.env` out of Git. Changes must preserve account isolation and target URL restrictions.
3. Run `npm ci`, `npm test` with a compatible Chromium installation and the relevant Docker or Vercel preview checks. Clearly report untested environments.
4. Run `python3 scripts/repository-audit.py --repo . --check`, `python3 scripts/badges.py --repo . --mode check`, and `python3 -m unittest discover -s tests -p 'test_badges.py'`.
5. Add/update badges only when manifests, workflows or deployment configuration justify them. Badges are maintained by `scripts/badges.py`, adapted from [central standards](https://github.com/drakeg/madmallard-repository-standards); dynamic GitHub badges must not be replaced by hardcoded success or release claims.
6. Document behavior and release changes in the same PR. Fix broken checks before merge and honor required reviewers and branch protections. Never auto-merge around protections.

Third-party license obligations are documented in `THIRD_PARTY_NOTICES.txt`. This repository has **no published open-source license**; contributors should not imply permission to redistribute its source. Source licensing requires the owner's explicit decision.
