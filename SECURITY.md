# Security policy

This is a pre-1.0 application and is not certified for WCAG or security compliance. Report suspected vulnerabilities privately to the repository owner through GitHub private vulnerability reporting where enabled; do not post secrets, exploit payloads, or customer data in public issues.

Security boundaries: admin/customer account isolation, HttpOnly SameSite session cookies, CSRF on browser writes, hashed optional bearer tokens, private-address rejection, confirmed website authorization, standard public web ports, a scan concurrency lease, and server-only Turso credentials. A web-based scan is not a substitute for container/network egress isolation; DNS rebinding, redirects, and untrusted browser behavior need ongoing review. Keep `LOCAL_TESTING=false` on internet-facing deployments, avoid anonymous scans, and do not publish LAN ports to the public internet.

Production must use HTTPS. Do not commit `.env`, Turso credentials, customer reports or application DBs. Review `npm audit` and security workflow failures before merging. Do not replace vulnerabilities with untested major dependency bumps. Report and prioritize confirmed issues by severity; revoke compromised tokens and rotate secrets through managed settings. Back up and verify restoration before destructive data migrations.
