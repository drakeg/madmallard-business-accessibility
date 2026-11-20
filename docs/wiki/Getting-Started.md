# Getting Started

## Local Docker Compose

1. Install a compatible Docker Engine and Docker Compose.
2. Clone `drakeg/madmallard-business-accessibility` and copy `.env.example` to `.env`.
3. For a fresh local installation, set an unguessable `API_TOKEN` (32+ characters) to claim the first administrator account. Do not commit `.env`.
4. Run `docker compose up -d --build` and open `http://localhost:8086/login`.
5. Create the first administrator, then sign in using your username and password. Website sessions do not require entering an API token.

For access from trusted devices on the same LAN, set `BIND_ADDRESS=0.0.0.0` in the local `.env` and use `http://YOUR-HOST-LAN-IP:8086`. Do not expose an HTTP test deployment to the public internet. The named Docker volume persists scans; do not run `docker compose down -v` unless deleting data is explicitly intended.

See [[Deployments]] for Vercel and [[Security and Privacy]] before enabling target-site scanning.
