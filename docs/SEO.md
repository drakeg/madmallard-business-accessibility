# SEO checks and OpenSEO assessment — November 14, 2026

## Shipped without paid services
Each new authorized page scan collects an on-page snapshot with the existing Chromium browser: title, description, H1 headings, canonical URL, observed robots meta/X-Robots-Tag, mobile viewport, JSON-LD parsing and Open Graph title/image presence. Results are saved on the audit record, visible in Review, and included in JSON export. Customer ownership checks apply to the entire record, including SEO data.

These are observed signals and review prompts. JSON syntax is not schema validation. No noindex directive does not prove indexability. Multiple H1s or a missing canonical are review prompts, not proof of ranking harm. Private/login pages may intentionally use noindex. There is no fabricated SEO score, keyword ranking estimate, rich-result guarantee, robots.txt retrieval or backlink data. The captured rendered DOM may not include late-loading content. Old audits are not retroactively scored; re-scan to collect SEO data.

The dashboard uses the latest completed scan per exact URL for unresolved accessibility instances and SEO checks marked review/fail. It shows coverage so missing SEO data cannot be mistaken for a clean result. Charts and totals summarize only the loaded history (up to 100 records), scoped by the existing ownership API. History search/status filters affect visible rows, not the overview metrics.

## OpenSEO primary-source review
- Project and workflow description: https://github.com/every-app/open-seo/blob/main/README.md
- License: https://github.com/every-app/open-seo/blob/main/LICENSE — MIT, copyright 2026 Ben Senescu. Commercial use is permitted subject to preserving the required license/copyright notices in copies or substantial portions.
- Runtime/provider requirements: https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_DOCKER.md
- Dependency manifest: https://github.com/every-app/open-seo/blob/main/package.json

OpenSEO offers keyword research, rank tracking, competitor/backlink workflows, site audits, AI visibility and MCP integration. Its documented self-hosting requires a DataForSEO API key; data usage is charged by that provider. Optional AI/rendering workflows can involve OpenRouter and other providers. Docker documentation specifies at least 4 GiB allocated to Docker and a stack using celld, RustFS, Nginx and a crawl gateway. It deliberately supports crawling public HTTP(S) sites only, not private Docker targets.

Decision: do not activate or install this additional stack under the current no-cost constraint. No DataForSEO account, key, paid request, OpenRouter request or OpenSEO container was created. The on-page checker in this change is original project code using our existing browser; no OpenSEO source was copied, and it is not claimed as a runtime dependency. Existing axe-core/Playwright attribution remains in the site footer.

## Optional later integration
Evaluate a separate, explicitly enabled OpenSEO provider adapter for keyword/backlink/rank data after a spending decision. Require tenant-scoped provider/project mappings, credential protection, authenticated server-side calls, request budgets and customer authorization tests. Do not expose an unrestricted OpenSEO/MCP endpoint to customers. Audit the actual runtime/dependency licenses before distributing a combined stack; the repository's MIT license alone does not cover every dependency. Provider metrics must identify their source, collection date and cost. A free on-page result must not silently trigger a billable enrichment request.
