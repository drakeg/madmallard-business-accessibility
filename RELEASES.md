# Releases and versioning

Current package version: `0.1.0` (from `package.json`). No published GitHub release/tag is asserted here. `README.md` release badge appears only after verifying an actual published release.

Use [Semantic Versioning](https://semver.org/) once product contract/API stability is established:
- **Patch** (`0.1.1`): backwards-compatible bug fixes, reliability improvements, documentation and security fixes with no user-visible breaking change.
- **Minor** (`0.2.0`): new backwards-compatible features (reports, portal capabilities); before v1, explicitly describe compatibility risks.
- **Major** (`1.0.0`, later `2.0.0`): stable paid-customer-supported feature contract or intentional breaking API/data behavior requiring migration.

A merged PR does not automatically require a release. Release only after user-visible value or critical security correction, clean automated tests and successful environment-specific smoke tests. For production releases verify an authenticated scan, customer isolation, history persistence and report exports. Record rollback plan and schema migration consequences; preserve Turso and Docker data. If any check is unavailable, mark the release blocked rather than tagging success. Document all changes, known limitations and verified environments in the GitHub release notes before publishing a tag. Require maintainer review for production promotion.
