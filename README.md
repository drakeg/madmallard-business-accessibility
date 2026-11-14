# Mad Mallard Business — Accessibility Workbench

Private single-operator toolkit for a narrowly scoped paid accessibility audit and manual repair review service. Scan one authorized URL at a time with Chromium + axe-core, review findings and manual checks, export JSON, and compare two scans of the same page. The operator performs and verifies source-code repairs separately. Automated testing is not certification of WCAG or legal compliance.

## Local start
Requires Node 24 and Chromium, or Docker Compose. Copy `.env.example` to `.env`, set a random token (minimum 32 characters) and optionally restrict target origins. `docker compose up --build -d`, then http://localhost:8086. For native development set `API_TOKEN`, `ALLOWED_ORIGINS`, optionally `CHROMIUM_PATH`, then `npm ci && npm start`. `.env` is read by Compose, not native Node; use `node --env-file=.env src/server.js` for native loading. Never scan without owner permission. If an origin restriction is configured, include required CDN origins. Leave it empty for unrestricted domain selection. Page POST requests and targets outside configured restrictions are blocked; private targets require explicit local-testing mode.

Use the same token in the UI. Start scan, inspect failures and incomplete checks, record evidence for fixed/dismissed findings, conduct keyboard/focus/zoom/screen-reader review, and export records. Compare URL-matched scans after the customer or operator has repaired the code. Differences are selector-based leads for review, not automatic proof that a defect is fixed. Authenticated sites, multi-page crawling, PDF testing, automated repairs, outbound sales and paid AI APIs are outside this MVP.

## Deployment and tests
See [deployment runbook](docs/DEPLOYMENT.md). Includes Dockerfile/Compose, ECR digest workflow, ECS/Fargate task renderer and service template, Kubernetes/EKS StatefulSet/PVC/network policy. Cloud infrastructure prerequisites are explicit; nothing deploys automatically. Single replica, SQLite persistence. No multi-tenant accounts or public scan endpoint.

`npm test` runs policy, persistence, comparison, API and browser-fixture tests. Set `CHROMIUM_PATH` to a local Chromium executable if Playwright browsers are not installed. Browser test skips explicitly when no browser is available. See [validation](docs/VALIDATION.md) for actual execution evidence and remaining release gates.

## Business pilot (hypothesis)
Buyer: small agencies maintaining local-business sites. Offer: audit three agreed public pages, prioritized findings, one manual review session and one retest after repairs; repairs quoted separately. Pilot price hypothesis: $249, not validated demand or promised income. Seek five owner-authorized agencies; proceed only if two request a scoped review and one accepts a paid pilot within 48 hours. Do not promise compliance or legal protection. Deliver findings with scope, date, limitations and unresolved manual checks.

## Portfolio
Portfolio hub: https://github.com/drakeg/madmallard-ai-operations . Shared topic `madmallard-business`; new repositories use `madmallard-business-<offering>`. Separate codebases allow independent licenses, customers and releases. Keep commercial readiness and demand evidence in the hub rather than treating a working demo as a validated business.

## Licenses
Private project code: all rights reserved pending owner's license decision. Dependencies retain their own licenses: Playwright Apache-2.0, axe-core and @axe-core/playwright MPL-2.0, ipaddr.js MIT. These permit commercial use with conditions; MPL-covered modified files remain subject to source-availability requirements when distributed. Preserve notices and audit the installed dependency tree before distributing an image. Chromium/OS packages have their own notices and licenses; this is not an exhaustive redistribution review. No Corey Ganim content, customer material or third-party project source is republished. No AI-provider API or paid service is required.

## Local Docker testing and attribution
An empty `ALLOWED_ORIGINS` removes the domain allowlist; normal mode still blocks private addresses and nonstandard ports. For operator-only local development, set `LOCAL_TESTING=true` in `.env` and recreate Compose. This permits RFC1918/loopback/IPv6 unique-local destinations and custom ports; link-local metadata endpoints remain blocked. Keep it off in shared/cloud deployments. In local mode use `http://localhost:8016/`. Inside Docker Desktop the scanner resolves localhost to the host gateway while preserving the localhost Host header, so Django development apps accept it. Numeric loopback input is normalized to localhost. `host.docker.internal` also works if the target accepts that hostname. Docker Desktop supplies this hostname; native/non-Desktop Linux requires an appropriate host-gateway mapping.

The user explicitly authorized unrestricted domain selection and local-container testing on November 14, 2026. This supersedes the earlier mandatory domain-approval guidance for this feature. Authentication and site-owner permission remain required. Footer credit links upstream axe-core, axe-core's Playwright integration and Microsoft Playwright. `THIRD_PARTY_NOTICES.txt` and `/third-party-notices` preserve bundled dependency licenses/notices.

## Audit history
Use **Delete audit** next to a completed/failed audit, or **Clear all history** to erase every stored record. Both ask for confirmation; deletion removes associated review notes and cannot be undone. Running scans cannot be deleted or cleared. Clearing stored data does not remove reports previously downloaded to your computer.

Local examples on Greg's Mac: Tickets `http://localhost:8016/`, MyPillar `http://localhost:8017/`, VideoShare `http://localhost:8010/`, SolarPower `http://localhost:8015/`, and Madmallards Code `http://localhost:8096/`. Only scan pages you own or have permission to test. Login-required pages need separate future authentication support; scanning a login URL audits that page, not the protected app behind it.

**Review interface:** Review opens a focused, scrollable modal rather than adding content beneath the history. Use Close review or Escape to return to the selected audit; save/error feedback stays inside the modal. The modal fits mobile screens and keeps its close control visible while scrolling.
