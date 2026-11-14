# Accounts, ownership and release requirements

## Implementation
SQLite adds users, sessions and persisted login-attempt counters without deleting audits. Existing records are claimed by the first administrator during token-authorized one-time setup; administrators can always see legacy unassigned records. `API_TOKEN` is now a bootstrap secret, not a shared login after accounts exist. The pre-setup compatibility bearer path exists only until the first account is created. Do not leave an internet-accessible installation uninitialized.

Passwords use independently salted scrypt (N=131072,r=8,p=1,64-byte output). Password policy: 12–128 characters. API keys are 32–256 URL-safe characters; generated keys are 256 random bits, stored only as SHA-256 hashes. One active API key per user. A unique hash index prevents accidentally assigning the same key to multiple accounts. Token replacement immediately removes the old key; password confirmation is required. API keys preserve their owner's permissions, including customer read-only restrictions.

Session cookies contain random 256-bit values; only their hashes persist in SQLite. Expiration is eight hours, HttpOnly and SameSite=Strict. Set COOKIE_SECURE=true on HTTPS deployments (included in ECS/EKS configuration). Non-GET cookie-authenticated API mutations require a session CSRF header, check the request Origin against the public Host/scheme and reject cross-site Fetch Metadata. Bearer integration requests do not need a session CSRF header. Use a dedicated hostname and HTTPS for a customer deployment, not shared localhost ports. Local cookies are for development only.

Account setup/login attempts have database-backed 15-minute limits by connection address and username. Do not blindly trust forwarded address headers; a proxy can cause shared rate-limit buckets. Production ingress rate limiting and alerting require configuration on the chosen platform. No external identity provider, email or billing account was added.

Customers can list/get/export/compare only records whose ownerId matches their user ID. Ownership checks happen in the API before reads; customer mutations and customer-account administration are denied. Hidden UI buttons are convenience, not the enforcement mechanism. Assignment only targets a real account, is administrator-only, and is blocked while scanning. Async scan completion retains its assigned owner. Each account is one customer boundary; organizations with multiple contacts require a future membership model.

## Operations
Do not commit credentials, databases or backups. Backup the entire SQLite dataset including accounts/session state consistently; a local pre-migration backup was taken before the change. Tokens cannot be recovered from hashes. Regenerate through the profile page. Password changes revoke sessions but do not revoke the independent API token; regenerate it separately if compromise is suspected.

The initial administrator may be initialized locally for Greg with a generated temporary password copied to his Mac clipboard. Change it from Profile after first login. Password reset without a signed-in account is currently a local administrator maintenance operation; no email recovery, public signup, MFA, account-disable UI or team memberships are implemented. These are explicit backlog items before opening a customer-facing service.

## Release gates
Local tests cover password login/setup, session expiry/logout/password-change revocation, token replacement and custom-key save, ownership/IDOR across list/get/export/compare, forbidden customer writes, role escalation attempts, CSRF and mobile browser behavior. Separate production review must validate TLS, secure cookies, proxy behavior, rate limiting, backup restore, account recovery and network isolation. Local scan mode must be off on a shared deployment. The portal remains on Greg's Mac and is not remotely reachable by customers until a separate deployment is authorized.

Password work factors were checked against the OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html . Hashes record their work factor so future upgrades can preserve existing accounts.
