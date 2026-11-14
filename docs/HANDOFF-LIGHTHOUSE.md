# Development handoff — November 14, 2026

Greg is moving product development to a separate chat; the original chat will remain focused on business-opportunity research. Continue this feature from the current Git state rather than starting over.

## Working local baseline
- Private repo: drakeg/madmallard-business-accessibility.
- Mac checkout: /Users/drakeg/Projects/madmallard-business-accessibility.
- Docker Compose project: madmallard-accessibility; service: workbench.
- App: http://localhost:8086 (loopback only), administrator username greg. Do not print credentials or assume the initial temporary password is still in use.
- Account/profile/customer isolation is on main through PR #3.
- PR #4 (feat/dashboard-owner-dialog) is open: polished dashboard, ownership dialog, history filters and original no-cost on-page SEO checks. That baseline passed 12 native/container tests and desktop/mobile visual checks. It is the version currently built into the running local container.
- Existing audits/users live in the persistent SQLite volume. Do not erase it. A pre-account backup exists as /app/data/before-accounts.sqlite, but it predates later records/accounts and is not a current restore point.

## Current unfinished feature
Branch feat/lighthouse-detailed-reports is based on PR #4's branch. It checkpoints code for optional Lighthouse integration and actionable reports. It has NOT been fully tested or rebuilt into the running container. It is not release-ready.

Added pinned lighthouse 13.6.0 and puppeteer-core 25.17.0 (Node 24 production target; both Apache-2.0). A manual native local-fixture run returned all four Lighthouse categories successfully. npm audit reported zero vulnerabilities after installation. Existing source syntax checks passed when run. The complete new-feature regression suite has not been executed.

New source:
- public/guidance.js: curated remediation and verification guidance shared by UI/server.
- src/evidence.js: captures axe HTML/selectors/check data/related nodes; distinguishes incomplete checks and enriches old reports without inventing missing evidence; summary payload strips large Lighthouse raw data from history lists.
- src/report.js: escaped, printable self-contained HTML report.
- src/lighthouse-worker.js: Puppeteer Chrome plus context-wide Playwright request guard, programmatic Lighthouse desktop lab run, four categories and complete raw LHR.
- src/lighthouse.js: bounded isolated worker/process-group cleanup and temporary profile removal.
- scanner/server/UI: optional includeLighthouse, progress stage, detailed review, HTML/JSON/full-Lighthouse report downloads. Lighthouse failure should retain completed axe/SEO evidence.

## Finish and verify
1. Read AGENTS.md and inspect the current diff. PR #4 may have merged since this handoff; check and update/rebase/retarget accordingly.
2. Review the implementation, especially request interception across redirects/frames/popups, GET-only rules, service workers, default private-network blocking, local Docker host routing, child timeout/cleanup and partial-result handling.
3. Add real-browser fixture tests for combined axe+SEO+Lighthouse, including blocked unapproved resource requests; existing manual fixture was Lighthouse-only. Add report HTML escaping, evidence preservation, legacy-data fallbacks, timeout/error handling and customer IDOR tests for /report.html and /lighthouse.html. Ensure the new tests are included in npm test.
4. Check src/report.js output and review UI carefully; preserve DOM evidence as text, never executable markup. Render and inspect downloadable reports. The native Lighthouse HTML is generated only on a protected attachment endpoint. Historical audits must explicitly show missing original evidence rather than fabricate it.
5. Expand SEO observations/remediation where needed; new JSON-LD parse errors have snippets, but verify correct block indexing and presentation. Remove unused rendering code if appropriate.
6. Update third-party notices and footer attribution for Lighthouse, Puppeteer and relevant redistributed dependencies. Existing public/third-party-notices.txt has NOT yet been regenerated for these additions.
7. Run full native and Docker suites; Chromium is /usr/bin/chromium in Docker, native Chrome is /Applications/Google Chrome.app/Contents/MacOS/Google Chrome. Existing test command stages browser checks before password/API tests because combined runs previously experienced Docker Desktop navigation timeouts. Do not claim skipped/planned tests passed.
8. Take a consistent current backup before updating the live instance. Rebuild/restart only this Compose project; preserve its volume/accounts/audits. Perform an authorized live scan of a local app (e.g. Tickets localhost:8016) with Lighthouse enabled, verify reports, scores/settings/warnings, and mobile UI. Do not change unrelated apps or reset Greg's password.
9. Update docs/VALIDATION.md and relevant runbooks with actual results/limitations and provide PR links. The new draft PR is stacked on PR #4; avoid duplicating or losing the dashboard changes.

## Constraints and product direction
No purchases, paid API calls, cloud deployments, outreach or new schedules. Local Docker development/testing is authorized. Keep Docker/ECR/ECS/EKS configurations. No Cloudflare migration for this project. Preserve account isolation: administrators manage all scans and customers; customers only read/export/compare their own assigned scans. API tokens are optional per-user integration credentials; website sign-in uses username/password sessions.

Report goal: show the exact affected selector/HTML, why it was flagged, actual engine measurements, concrete repair guidance, verification steps and authoritative references. Incomplete engine checks are manual-investigation items, not confirmed violations. Lab scores vary with host/environment/request blocking and do not certify compliance or rankings.

OpenSEO was reviewed (MIT) but not installed/copied: its provider-backed workflows involve DataForSEO charges and its documented crawler excludes private targets. Our existing on-page SEO checks are original code; Lighthouse is the approved no-paid-API next addition. See docs/SEO.md.
