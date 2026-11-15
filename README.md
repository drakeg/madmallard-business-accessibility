# Mad Mallard Business — Accessibility Workbench

Private accessibility audit toolkit and customer portal. Scan authorized pages with Chromium + axe-core, review findings/manual checks, export JSON and compare same-page before/after scans. Website repairs are performed separately. Automated results are not certification of WCAG or legal compliance.

## Local start
Copy `.env.example` to `.env`, set a random `API_TOKEN` (at least 32 characters), then `docker compose up --build -d`. Open http://localhost:8086. For a fresh installation, use the operator token once on **Create administrator account** to choose a username and password. Existing audits are assigned to this first administrator. Thereafter, sign in with your username/password; no token entry or browser token storage is required. Sessions last eight hours and survive service restart. The existing Mac instance is initialized separately; credentials are not committed here.

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
See [deployment runbook](docs/DEPLOYMENT.md), [validation evidence](docs/VALIDATION.md) and [backlog](docs/BACKLOG.md). Includes Docker Compose, ECR digest workflow, ECS/Fargate task renderer/service template and Kubernetes/EKS StatefulSet/PVC/network policy. Existing infrastructure prerequisites remain explicit. No cloud resources deploy automatically. Single process/replica with SQLite. Set `COOKIE_SECURE=true` behind HTTPS and preserve the original Host header through your proxy. Current Mac service is bound only to loopback, so remote customers cannot access it yet.

`npm test` runs policy, persistence, API and browser tests; set `CHROMIUM_PATH` if needed. Account tests cover customer isolation by ID/export/compare, prohibited writes, CSRF, password changes, expired/revoked sessions and token rotation. Browser checks cover setup, password login, profile editing, generation, customer creation/assignment and mobile read-only review. Tests are evidence for a local MVP, not a completed external security assessment. TLS, network isolation, account recovery, backup restore, security review and actual cloud/cluster validation remain production release gates.

No multi-page crawling, authenticated target-site scanning, PDF audit, automated website repair, paid AI API or public anonymous scanner. Customer login here does not authenticate the target website being scanned. HTTP error pages fail explicitly rather than returning misleading audit success.

## Business pilot — hypothesis
Buyer: small agencies maintaining local-business sites. Offer: audit three agreed pages, prioritized findings, a manual review session and one retest; repairs quoted separately. $249 is an unvalidated pilot-price hypothesis, not promised income. Test five owner-authorized prospects; proceed only with credible paid interest. Do not promise legal protection or certification.

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
