# Validation evidence — November 14, 2026

## Executed
- Six non-browser checks passed: private/reserved IP blocking, exact origin/protocol controls, mixed-DNS rejection, comparison semantics, persistence reopening, authenticated API including consent/review evidence/export/deletion.
- JavaScript syntax checks passed for server, browser UI and ECS renderer.
- Six Kubernetes YAML documents parsed; ECS service JSON and locally rendered task definition parsed and checked for Fargate/read-only configuration. This is not AWS or Kubernetes API validation.
- `npm audit --omit=dev --audit-level=high`: zero reported vulnerabilities at execution time. Not a guarantee against future disclosures or OS/browser vulnerabilities.
- Browser tests in the hosted workspace failed at Chromium launch because Unix socket operations are restricted. No application assertions ran in that attempt. Docker-based browser validation on the connected Mac is recorded below when completed.

## Release gates
Container build and browser outcomes are recorded below. A clean Compose smoke test returned HTTP 200 from the host; see below. Target AWS account/cluster validation, image security scan, TLS and egress-policy verification, backup restore and an owner-authorized staging-page scan are required before production. No AWS resources were deployed. Customer demand and pilot pricing remain unvalidated.

## Browser and packaging follow-up
- Docker image built successfully on the connected Mac (linux/arm64); no ECR push occurred. ECS linux/amd64 build is still a separate release check.
- All eight tests passed natively on the Mac with Node 22.23.4 and installed Google Chrome: includes actual axe detection/retest and UI authentication/history/review persistence. Node 22 is supplementary compatibility evidence; supported production target remains Node 24.
- Initial container-browser run found the test fixture used Playwright's single-page shorthand, which axe does not support; fixed it to use an explicit browser context. The actual scanner already used an explicit context. A UI navigation timeout was also observed; browser tests now use bounded waits and DOM-content readiness.
- Initial Compose startup probes failed (empty reply and an unhealthy observation amid overlapping test cleanup). Those attempts are not counted as passes. A separate clean-project run was used for the subsequent smoke check.
- Corrected full suite rerun inside the built Docker image with read-only root filesystem, writable `/tmp`, dropped capabilities and no-new-privileges: **8 passed, 0 failed, 0 skipped** (Node 24 + Chromium). This verifies the browser engine and UI under the container restrictions.

- Clean Compose project startup with persisted volume, read-only root and production command: in-container health endpoint and host port 18087 both returned HTTP 200 with `{"status":"ok"}`. Docker health state was still `starting` when inspected, so the timed health transition was not confirmed. The isolated test container/network/volume were then removed. Added a 45-second health start period for cold startup.

## Local-container and attribution follow-up — November 14, 2026
Fixed visible feedback for empty history and missing token; added optional domain restrictions and explicit local testing (off by default). Live Mac Docker scan of the operator-owned Tickets root at localhost:8016 completed with two finding instances. This is evidence of scan execution, not an accessibility verdict. Footer attribution and third-party notices returned successfully. Ten container tests passed, including empty-history connection feedback, upstream footer links, public-only defaults and local-network opt-in. Added preservation of the localhost Host header so Django targets accept the request; HTTP 4xx/5xx targets now fail explicitly instead of producing an audit of an error page.

Added confirmed individual deletion and bulk clear in the UI, with backend refusal while a scan is running. Browser/API regression checks cover cancelling a deletion, persisted individual deletion, and bulk deletion of stored records in isolated test databases. The existing live audit history was preserved during the deployment.

Review modal follow-up: replaced below-history detail rendering with a named native dialog, focus on the review heading, Close/Escape dismissal, focus restoration, sticky close controls, mobile sizing, background scroll lock and in-modal save/error feedback. All 10 native and Docker tests passed after updating the browser test to wait for asynchronous dialog opening before sending Escape. The running app was independently checked at a 390px mobile viewport: a real stored audit opened visibly in the modal with heading focus and closed successfully. Existing audit data was preserved.

Remembered sign-in follow-up: added no-storage, tab-session and seven-day browser-storage choices, automatic reconnection after reload, and Forget token. Only successful authentication saves a token; a rejected remembered token is removed. Expired stored records are discarded. Ten native and Docker tests passed, including tab reload, opting out, a new tab using the browser option, forgetting and expiration. The rebuilt local service is healthy. This is convenience storage scoped to the app origin, not server-side credential revocation; rotating API_TOKEN remains the revocation mechanism.
