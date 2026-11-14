# Deployment runbook — no cloud resources created

## Docker first
Copy `.env.example` to `.env`; generate a token with `openssl rand -hex 32` and optionally set authorized exact origins. Empty removes domain restrictions; private targets still require explicit local-testing mode. Run `docker compose config --quiet`, then `docker compose up --build -d`. Open http://localhost:8086. Token is entered in the UI; remembered sign-in is optional (tab storage or a seven-day browser setting). Local HTTP is for loopback only. For LAN/remote access place behind a trusted HTTPS reverse proxy; never expose this single-operator tool publicly. Stop with `docker compose down`; add `-v` only to intentionally erase all audit records. Back up the volume with the app stopped; SQLite and its WAL must remain consistent.

## ECR image
After cost/deployment approval, use an existing private ECR repository or create one separately. Build for linux/amd64, scan the resulting image, push to ECR, record its digest, then use `ACCOUNT.dkr.ecr.REGION.amazonaws.com/REPOSITORY@sha256:DIGEST`. Do not deploy `latest`. No workflow pushes images automatically. Refresh the base image and lockfile regularly and review scan results before each release.

## ECS/Fargate
`scripts/render-ecs.mjs` renders a real task-definition JSON locally. Required environment: `AWS_REGION`, digest-pinned `IMAGE_URI`, `EXECUTION_ROLE_ARN`, `TASK_ROLE_ARN`, `SECRET_ARN`, `EFS_ID`, `EFS_ACCESS_POINT_ID`. Run `node scripts/render-ecs.mjs /tmp/task.json` and inspect it. It does not invoke AWS.

Prerequisites: existing ECS cluster, two private subnets with outbound HTTPS through a restrictive egress proxy/firewall, ECR connectivity, TLS ALB restricted to operator CIDRs, IP target group port 8080 health path `/healthz`, task security group inbound only from ALB. Use HTTPS before transmitting the token. Provision CloudWatch log group `/madmallard/accessibility` with retention separately. Secret JSON contains `API_TOKEN` and `ALLOWED_ORIGINS`; execution role permits fetching only that secret (and its KMS key if applicable), pulling ECR and logging. Task role permits only EFS ClientMount/ClientWrite scoped to that access point. EFS must be encrypted, with access-point root directory owned by 10001:10001, mode 0750, mount targets reachable on TCP2049 from task security group. EFS policy must require encrypted transport. Render includes encrypted IAM-authorized EFS mount. Use platform 1.4.0 or later for secret JSON keys. Replace every placeholder in `infra/ecs/service.example.json` before any AWS command.

Keep desired count 1. Stop-before-start deployment settings prevent concurrent SQLite writers, at the cost of brief downtime. EFS SQLite locking/performance must be vetted under representative load; this is a small operator tool, not a multi-tenant service. For larger use migrate to Postgres and a job queue first. ECS does not enforce Kubernetes NetworkPolicy: an outbound firewall/proxy that blocks private, metadata and internal destinations is a release requirement. DNS validation alone cannot prevent DNS rebinding. ECR, Fargate, ALB, NAT, logs, secrets, and EFS can incur costs. Nothing has been provisioned.

## Kubernetes / EKS
`infra/kubernetes/workbench.yaml` targets an existing cluster. Replace image placeholder with a digest. Requires an existing `gp3` StorageClass and installed authorized EBS CSI driver on EKS. For other clusters select a supported RWO StorageClass. Create namespace first, then secret `accessibility` in namespace `madmallard-business` with `API_TOKEN` and `ALLOWED_ORIGINS` using your secret manager; do not commit plaintext secrets. Validate with `kubectl apply --dry-run=server -f infra/kubernetes/workbench.yaml` before applying. Kubernetes validation requires a reachable cluster and was not run here.

Default access: ClusterIP, operator `kubectl -n madmallard-business port-forward service/accessibility 8086:8080`. No public LoadBalancer/Ingress or EKS cluster is created. Keep replicas 1; StatefulSet uses stop/start replacement with retained PVC. Do not run simultaneous copies against the same data. Enable VPC CNI network-policy enforcement or another supported policy engine; a NetworkPolicy object alone does not enforce traffic. The included IPv4 egress restriction blocks common private/metadata ranges; validate actual DNS, CNI handling, routes, IPv6 and node-local DNS behavior on your cluster. IPv6 egress is not allowed by the policy. For external ingress, explicitly design TLS, source restriction and corresponding policy before changing access. Prefer dedicated isolated worker infrastructure and outbound proxy. App Chromium runs without a sandbox under the standard Playwright defaults; use this only for authorized trusted customer sites, never arbitrary public submissions. A container is not a malware sandbox.

## Release checks
1. `npm ci && npm test`; run browser fixture test with Chromium.
2. Build image, run Compose, verify scan of an owner-authorized staging site, export/review/compare, and restart persistence.
3. Scan image/dependencies. Verify no secrets, SSRF protection plus network isolation, backup restore and interruption recovery.
4. Validate manifests against target cluster/task APIs; canary on approved infrastructure, then manual release.

Docker, AWS registration, cluster dry-run and live-cloud tests remain operator release gates. Configuration availability is not proof of a successful deployment.

## Local testing update — November 14, 2026
For the Mac-only testing instance, `ALLOWED_ORIGINS` is empty and `LOCAL_TESTING=true`. Use localhost with the published target port, for example http://localhost:8016/. Chromium resolves localhost to the Docker Desktop host gateway, preserving the Host header accepted by development servers. Keep the workbench bound to loopback and local mode disabled in shared/cloud deployments. IPv4 link-local and the AWS IPv6 metadata address remain blocked.
