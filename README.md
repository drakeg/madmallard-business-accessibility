# Mad Mallard Business — Accessibility Workbench

[![License](https://img.shields.io/github/license/drakeg/madmallard-business-accessibility)](https://github.com/drakeg/madmallard-business-accessibility/blob/main/LICENSE)


<!-- madmallard-badges:start -->
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white) ![Docker Compose](https://img.shields.io/badge/Docker%20Compose-2496ED?logo=docker&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=white) ![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white) ![Turso](https://img.shields.io/badge/Turso-4FF8D2?logo=turso&logoColor=white) ![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white) ![axe-core](https://img.shields.io/badge/axe--core-663399?logo=deque&logoColor=white)

[![ci](https://github.com/drakeg/madmallard-business-accessibility/actions/workflows/ci.yml/badge.svg)](https://github.com/drakeg/madmallard-business-accessibility/actions/workflows/ci.yml) [![hosted-smoke](https://github.com/drakeg/madmallard-business-accessibility/actions/workflows/hosted-smoke.yml/badge.svg)](https://github.com/drakeg/madmallard-business-accessibility/actions/workflows/hosted-smoke.yml) [![security](https://github.com/drakeg/madmallard-business-accessibility/actions/workflows/security.yml/badge.svg)](https://github.com/drakeg/madmallard-business-accessibility/actions/workflows/security.yml) [![Issues](https://img.shields.io/github/issues/drakeg/madmallard-business-accessibility)](https://github.com/drakeg/madmallard-business-accessibility/issues) [![Pull requests](https://img.shields.io/github/issues-pr/drakeg/madmallard-business-accessibility)](https://github.com/drakeg/madmallard-business-accessibility/pulls)
<!-- madmallard-badges:end -->

Private accessibility audit toolkit and customer portal. Scan authorized pages with Chromium + axe-core, review findings/manual checks, export JSON and compare same-page before/after scans. Website repairs are performed separately. Automated results are not certification of WCAG or legal compliance.

## Local start
Copy `.env.example` to `.env`, set a random `API_TOKEN` (at least 32 characters) **for first-administrator setup**, then `docker compose up --build -d`. Open http://localhost:8086. For a fresh installation, use the operator token once on **Create administrator account** to choose a username and password. Existing audits are assigned to this first administrator. Thereafter, sign in with your username/password; no token entry or browser token storage is required. Sessions last eight hours and survive service restart. The existing Mac instance is initialized separately; credentials are not committed here.

Native development: Node 24 and Chromium; `npm ci`, set environment, then `node --env-file=.env src/server.js` (`npm start` does not automatically read `.env`). Docker Desktop is supported; other Linux hosts need a host-gateway mapping for localhost scan routing.

## Accounts and profiles
| Role | Access |
| --- | --- |
| Administrator | All scans; create/review/delete, manage customer accounts, assign ownership |
| Customer | View, export and compare only scans assigned to that account; read-only findings |

**Profile & settings** opens `/profile`. Edit your display name or change your password. Under **API token**, confirm your password to save an existing token or generate a random one. Replacement immediately revokes the previous API token; it does not sign you out. Tokens are optional integrations credentials: the website automatically uses your authenticated account. Only token hashes are stored, so a token cannot be shown again later; generate a replacement if lost.

Administrators create customer usernames and initial passwords on the profile page. No signup, invitation email or outreach occurs. On the workbench, choose **Scan owner** before starting a scan, or use **Assign owner** beside an existing completed/failed scan. Customers sign in at the same site address. Ownership is per account; customer organizations/shared teams are not implemented. Customers cannot request arbitrary scans or change/delete data. No customer data is exposed through another customer's API token or session.

Password changes revoke all website sessions for that account. **Sign out** revokes the current session. Account recovery/administrator password resets are currently local maintenance operations; no email recovery service is configured. See [account implementation and release gates](docs/ACCOUNTS.md).

## Scanning and history
An empty `ALLOWED_ORIGINS` removes domain restrictions. Normal mode blocks private/reserved addresses and nonstandard ports. Explicit `LOCAL_TESTING=true` permits private development targets and custom ports for administrator scans. Keep it off in shared/cloud deployments. Use `http://localhost:8016/` for Tickets, `:8017` for MyPillar, `:8010` for VideoShare, `:8015` for SolarPower or `:8096` for Madmallards Code on Greg's Mac. Chromium routes localhost to the Docker Desktop host gateway while preserving the localhost Host header. Numeric loopback input becomes localhost. Link-local and AWS IPv6 metadata addresses remain blocked.

Review opens a responsive modal with Close/Escape, focus restoration, manual checks, review notes and export. Administrators can delete one audit or clear history after confirmation; running scans cannot be removed. Deletion includes stored review notes, but not reports already downloaded. Customers see their assigned findings read-only. Scan authorization remains an operator responsibility, confirmed in the scan form.

## Deployment, tests and limitations
See [deployment runbook](docs/DEPLOYMENT.md), [validation evidence](docs/VALIDATION.md), [Sprint plan](SPRINTS.md) and [backlog](BACKLOG.md). Includes Docker Compose, ECR digest workflow, ECS/Fargate task renderer/service template and Kubernetes/EKS StatefulSet/PVC/network policy. Existing infrastructure prerequisites remain explicit. No cloud resources deploy automatically. Single process/replica with SQLite. Set `COOKIE_SECURE=true` behind HTTPS and preserve the original Host header through your proxy. Compose binds to loopback by default. To allow **trusted LAN devices** to access the local test instance, configure `BIND_ADDRESS=0.0.0.0` in the untracked `.env` and use `http://<host-LAN-IP>:8086`; keep firewall restrictions and never publish the test service to the public Internet.

`npm test` runs policy, persistence, API and browser tests; set `CHROMIUM_PATH` if needed. Account tests cover customer isolation by ID/export/compare, prohibited writes, CSRF, password changes, expired/revoked sessions and token rotation. Browser checks cover setup, password login, profile editing, generation, customer creation/assignment and mobile read-only review. Tests are evidence for a local MVP, not a completed external security assessment. TLS, network isolation, account recovery, backup restore, security review and actual cloud/cluster validation remain production release gates.

No multi-page crawling, authenticated target-site scanning, PDF audit, automated website repair, paid AI API or public anonymous scanner. Customer login here does not authenticate the target website being scanned. HTTP error pages fail explicitly rather than returning misleading audit success.

## Business pilot — hypothesis
Buyer: small agencies maintaining local-business sites. Offer: audit three agreed pages, prioritized findings, a manual review session and one retest; repairs quoted separately. $249 is an unvalidated pilot-price hypothesis, not promised income. Test five owner-authorized prospects; proceed only with credible paid interest. Do not promise legal protection or certification.

## Community, Wiki and sponsorship readiness

[Discussions](https://github.com/drakeg/madmallard-business-accessibility/discussions) is enabled, with a [welcome topic](https://github.com/drakeg/madmallard-business-accessibility/discussions/14), Q&A and feature ideas. A future public GitHub Wiki is prepared as versioned pages in [`docs/wiki/`](docs/wiki/); the Wiki feature cannot currently be enabled on the private repository with its existing plan. The repository remains private until explicitly authorized otherwise. Sponsorships require a working GitHub Sponsors account; the potential funding configuration is retained as a non-active template in `docs/community/FUNDING.yml.example` to avoid a broken Sponsor button. See [community setup and public release checklist](docs/PUBLIC_COMMUNITY_SETUP.md). Becoming public requires separate licensing, secrets and customer-data review.

## Portfolio and attribution
Hub: https://github.com/drakeg/madmallard-ai-operations . Shared topic `madmallard-business`; separate private repositories use `madmallard-business-<offering>`.

Footer credits Deque's axe-core and @axe-core/playwright (MPL-2.0) and Microsoft Playwright (Apache-2.0). ipaddr.js is MIT. Full bundled licenses/notices are in `THIRD_PARTY_NOTICES.txt` and `/third-party-notices`. Chromium/Debian packages retain their own notices; audit redistribution obligations before distributing images. Private project source remains all rights reserved pending the owner's license decision. No Corey Ganim or customer content is republished. Dependencies permit commercial use subject to their license obligations.

## Dashboard, ownership and on-page SEO
The start page includes recent-audit totals, completed/failed counts, distinct pages, unresolved accessibility instances, SEO review counts and coverage, a seven-day activity chart, and impact bars. Metrics use loaded history only (up to 100 records); latest-page metrics use the newest completed audit per URL. They are not compliance or ranking scores. Search and status filters narrow the history list; each row shows its current owner and timestamp.

**Assign owner** opens a dedicated modal showing the current owner and a new-owner selector. Save is enabled only for a change; success and errors are shown in that modal, and the history owner updates immediately. It does not depend on the separate new-scan owner setting.

New audits include on-page SEO findings in Review and exported JSON. Older audits show that SEO data is unavailable until a new scan. See [SEO scope and OpenSEO assessment](docs/SEO.md). OpenSEO is MIT-licensed, but its provider-backed data workflows incur usage costs and its crawler does not support private targets. It remains an optional future integration; no paid service or OpenSEO runtime was activated.

If no other account exists, Assign owner explains that there is nobody to share with and links to customer creation in Profile & settings. It never silently assigns a scan back to the same account.

## daisyUI appearance
The dashboard and account pages use **daisyUI 5 with Tailwind CSS 4** and a local Mallard theme. Components include buttons, inputs, selects, checkboxes, badges, cards and native review dialogs. `assets/theme.css` defines the theme and source scanning; `npm run build:css` compiles it into the committed `public/daisyui.css`, served locally without CDN dependencies. Run the build after changing component classes or theme tokens. `public/style.css` retains the chart/dashboard layout and accessibility-specific overrides. Styling does not alter authentication, customer ownership, scanning policy or SQLite data.

## Optional Lighthouse and actionable reports
For an authorized new scan, enable the **Lighthouse** option to run a bounded local Chromium desktop lab audit, without paid APIs. The scan first retains axe accessibility and on-page SEO results; if Lighthouse fails or times out, its error is recorded without discarding completed results. Four category scores are laboratory snapshots, not site-wide ratings or certification. Restricted requests, blocked resources and host load may affect them.

Open a completed audit to review captured selectors, escaped HTML, exact axe check messages, measured values where the tool provides them, remediation steps, verification steps and linked rules. Incomplete axe checks are marked **needs manual investigation**, not confirmed violations. Older records show missing original evidence; they are never retroactively treated as measured results. Download a self-contained printable HTML audit, structured JSON audit (including raw Lighthouse data when available) or the complete Lighthouse HTML report. Access checks on each export use the same audit ownership rules as the detail API.

Lighthouse is a desktop lab run and does not replace mobile checks or real-user performance monitoring. Lighthouse requires enough local CPU/memory and a Chromium build compatible with the installed Node 24 dependencies. Do not enable LOCAL_TESTING on public hosts; it deliberately loosens local-network restrictions. On a public deployment use network-level egress controls and a single replica while SQLite/in-process work remains. No AWS resources or paid providers are invoked by these options.

### Additional offline HTML validation (no Lighthouse required)
New scans also perform an **HTML-Validate** document audit using the already-rendered page's HTML. It detects malformed or semantically problematic markup (for example heading order, missing image alt attributes, invalid nesting, duplicate IDs). This report is shown in the SEO review and downloadable printable report with exact rule messages, selectors and documentation links. The validator does not initiate network requests, and is independent of Lighthouse/Chromium's second run. Validation is capped at 750 KB of rendered HTML and preserves an explicit unavailable state for larger pages or parser errors. These HTML diagnostics are *not* keyword rankings, backlinks, Google indexing, real-user performance, or a technical SEO site crawl. No new paid services or crawler permissions are enabled.

For site-wide technical SEO across links, redirects and multiple pages, [SiteOne Crawler](https://github.com/janreges/siteone-crawler) is a promising separate CLI option; it must be evaluated with network/redirect isolation before granting any in-app arbitrary crawl behavior. [Unlighthouse](https://github.com/harlan-zw/unlighthouse) still uses Lighthouse and does not bypass the current Chromium failure.


## Vercel deployment (experimental preview)

Vercel now has a dedicated `api/index.js` serverless handler. No `API_TOKEN` is required for the website itself. The single-use `ADMIN_SETUP_TOKEN` is used **only to protect creation of the first administrator account** on a publicly accessible domain. Subsequent users sign in with username/password; external API consumers can generate their own bearer token in Profile.

**Storage is mandatory for real accounts and scan history.** Serverless local SQLite files are not durable. Install a persistent database in your Vercel project, such as [Supabase Postgres](https://vercel.com/marketplace/supabase) (automatic `POSTGRES_URL`), [Neon](https://vercel.com/marketplace/category/database) (`DATABASE_URL`) or [Turso](https://vercel.com/marketplace/tursocloud/database) (`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`). The Vercel handler creates tables within the private `mm_audit` Postgres schema, which is not part of Supabase's exposed public Data API. SQLite-compatible Turso keeps existing table syntax. Credentials are read only server-side. Use a dedicated new database for this application, not a shared application database.

1. Import/link this repository to the Vercel project. The included `vercel.json` routes pages and APIs to one Node function; static assets are bundled explicitly. Vercel Node 24 or 26 is supported.
2. Connect a managed database in Vercel Storage. With no database, the site displays but API routes return a clear 503 rather than pretending a local SQLite DB is durable.
3. Add `ADMIN_SETUP_TOKEN` as a secret environment variable for Production/Preview, generated with `openssl rand -hex 32`. Do not add `API_TOKEN`; it is neither required nor used in the Vercel runtime. After the first administrator is created, this secret is not consulted for sign-in and can be rotated or removed.
4. Open the site's `/login` route and create the first administrator with that one-time secret. Then sign in normally.
5. Start a scan without Lighthouse. Vercel uses packaged serverless Chromium and Fluid Compute's `waitUntil` to persist results asynchronously while the UI polls. Only public HTTP(S) standard-port destinations are allowed; local/private DNS targets and unapproved origins are rejected. The Vercel Lighthouse option is intentionally disabled because the engine has not been validated in that runtime.

**Deployment constraints:** Vercel's compute-time and resource limits still apply. Browser-heavy targets may fail or time out; such failures must appear as failed audits, never completed. A 100-second database lease prevents concurrent scans and must expire after an interrupted invocation. Existing local Docker credentials/data are not automatically migrated to the new remote database. Keep the local Docker deployment running until remote login, scanning, owner isolation, report downloads and persistent history have all passed live preview tests. Do not make an unverified preview production.

### Recovering interrupted Vercel scans

Hosted scan jobs are limited by Vercel Function execution time. A durable database lease (150 seconds) prevents overlapping jobs; if a function stops without writing a terminal result, the next audit-list refresh or scan request converts its abandoned `running` record into a visible `failed` record with a retry explanation. Scan-progress writes are conditional on the audit still being `running` so a late progress callback cannot overwrite a completed or failed result. Terminal success/failure writes additionally require the active database lease to belong to that audit and have time remaining; timed-out or superseded jobs cannot overwrite stored evidence. Completed reports, review notes, customer assignments, and other audit history are not purged by recovery. A failed scan must be retried by starting a new audit; no repeated scans run automatically.


### Read-only hosted smoke checks

Run `npm run smoke:hosted` against the canonical Vercel production deployment or set `SMOKE_BASE_URL=https://your-preview-host.example` for another reachable environment. This checks `/healthz` (HTTP 200), `/api/auth/status` (HTTP 200 with a boolean `needsSetup`) and anonymous `/api/audits` (HTTP 401). It never creates accounts, starts scans, reads customer audit details or stores credentials. If the production database still has no administrator, the check emits a clear **SETUP PENDING** warning (including a GitHub Actions warning annotation) while keeping the transport/security health check separate from the customer-ready release gate. GitHub Actions `Hosted smoke` runs on weekdays and can be manually triggered. **Passing these checks does not prove authentication, Chromium scans, completed reports or historical persistence.** Those remain the next manual authenticated release gate.


### Serverless Chromium integration validation

The GitHub CI test job exercises `@sparticuz/chromium` on Linux against an **in-process, loopback-only test fixture** with explicit local-testing permission. The test checks that the packaged serverless binary actually launches and that an authorized axe/SEO/HTML-Validate scan completes; it does not scan a third-party website. Run `npm run test:vercel` on Linux to reproduce. The serverless browser test is skipped on macOS because the packaged binary is Linux-only. A passing Linux CI test is necessary but **not sufficient** for the Vercel release gate: an authenticated live scan, saved report and reloaded history must still pass against the deployed site.


### Scan status feedback

During an authorized scan the dashboard polls audit history. A completed or failed job now produces an accessible status message with the page URL and next step; failed jobs include their stored error and suggest starting a new scan instead of retrying automatically. Previously completed history never generates spurious notifications on sign-in. This is browser-session feedback, not a push notification or server-side job scheduler.


### Hosted scan persistence regression

The cloud scan runner now has a deterministic integration test that executes the **actual** background-job persistence and lease cleanup logic against a throwaway local libSQL database. The test verifies that a successful scan's report is returned by the authenticated API and remains in history, and that a simulated browser failure produces a failed audit with an actionable stored error. The real Linux serverless Chromium scanner has a separate CI integration test. Both are required because neither test independently proves the live Vercel/Turso workflow.
