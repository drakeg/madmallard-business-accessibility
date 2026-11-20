# Frequently Asked Questions

**Do I need an API token to log in?** No. Username/password sessions handle website sign-in. The optional per-user API token is for external integrations. The one-time administrator setup secret is separate.

**Why can I load the dashboard but not scan?** Confirm that you are signed in as an administrator, have permission to scan that site, and that the destination is a permitted public website when hosted on Vercel.

**Why is Lighthouse unavailable on Vercel?** Its Chromium execution has not been reliably verified on that runtime. Local Docker may offer it as an optional extra; the core accessibility/SEO report does not depend on it.

**Why did a scan fail instead of finishing?** Hosting limits, blocked target requests, network errors, and browser failures can interrupt a scan. Review the failure reason, verify site authorization, and retry with a fresh audit.

**Where are previous scans stored?** Docker uses a named volume with SQLite; hosted Vercel uses Turso. The two databases are not automatically synchronized or migrated.

**Can I open a public issue with a report?** Do not post private client URLs, audit outputs, credentials, or personal data. Use a minimal sanitized reproduction.
