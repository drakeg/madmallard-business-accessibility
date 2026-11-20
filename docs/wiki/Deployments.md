# Deployments

## Docker Compose

The application uses a persistent Docker volume for its local SQLite audit database. The default bind is loopback for safety. Use `BIND_ADDRESS=0.0.0.0` only on trusted LANs with appropriate firewall restrictions. `LOCAL_TESTING` permits additional private targets only in explicitly authorized local testing environments; it must remain off in public deployments.

## Vercel + Turso

The Vercel deployment uses a Node serverless entrypoint, durable Turso database environment variables (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`), and a **one-time** `ADMIN_SETUP_TOKEN` for the first administrator. Do not configure or expose a shared API token for routine browser logins. Keep credentials in Vercel's protected environment settings.

Vercel's free-tier/runtime limits may interrupt browser scans. Interrupted scans are marked as failed so they can be retried; the report history is durable in Turso. Automated read-only smoke checks verify health, storage-backed account status, and anonymous rejection, **not** a complete authorized browser audit.

See [deployment guide](https://github.com/drakeg/madmallard-business-accessibility/blob/main/docs/DEPLOYMENT.md) and [release gates](https://github.com/drakeg/madmallard-business-accessibility/blob/main/RELEASES.md). Live authenticated end-to-end scan verification remains a separate release requirement.
