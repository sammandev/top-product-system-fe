# Frontend Blue-Green Deployment

This frontend repo now includes the release-slot assets for a blue-green rollout modeled on the PTB_OT frontend deployment pattern.

This implementation is intentionally frontend-only for the first phase:

- Public frontend entry stays at `172.18.220.56:9090`.
- Backend stays stable at `172.18.220.56:7070`.
- The shared edge proxy and active-color state do **not** live in this repo because frontend and backend are split across repositories.

## Canonical Frontend Files

- `deploy/compose/docker-compose.blue-green.yml`
- `deploy/docker/Dockerfile.blue-green`
- `deploy/nginx/nginx.blue-green.conf`
- `deploy/scripts/deploy-blue-green.sh`
- `.env.production.example`

## Separate Edge-Proxy Home

The deployment script expects a separate server-side edge-proxy home that owns host port `9090` and tracks the active frontend color.

Recommended operator variable:

```bash
export TOP_PRODUCT_EDGE_DIR=/srv/top-product-deployment/edge-proxy
```

Optional network override:

```bash
export TOP_PRODUCT_EDGE_NETWORK=ast-tools-edge
```

The script will also auto-detect these common sibling paths when present:

- `../top-product-deployment/edge-proxy`
- `../deployment-infra/edge-proxy`

## Build-Time API Strategy

For this first rollout, the frontend keeps using an explicit backend URL at build time.

Default build arguments in the blue-green compose file point to:

- `VITE_API_BASE_URL=http://172.18.220.56:7070`
- `VITE_API_URL=http://172.18.220.56:7070`

Override them from a real `.env.production` file or exported shell environment before building the release image.

Example:

```bash
set -a
source .env.production
set +a
```

## One-Time Cutover

The first cutover is not zero-downtime because host port `9090` must move from the current dev-mode serving path to the new shared edge proxy.

Recommended order:

1. Export the production frontend environment values.
2. Start the initial `frontend-blue` slot on the shared edge network.
3. Verify the slot health endpoint.
4. Stop the current frontend process or container that directly owns `9090`.
5. Start the shared edge proxy on `9090`.
6. Switch frontend traffic to `blue`.
7. Validate public page load, login, and at least one API-backed route.

## Routine Release

```bash
cd /path/to/top-product-system-fe
export TOP_PRODUCT_EDGE_DIR=/srv/top-product-deployment/edge-proxy
set -a
source .env.production
set +a
./deploy/scripts/deploy-blue-green.sh
```

Optional flags:

- `--skip-build`
- `--keep-old`
- `--skip-cleanup`

## Rollback

Rollback is a traffic switch in the shared edge-proxy home, not a rebuild.

Example operator flow:

```bash
cd /srv/top-product-deployment/edge-proxy
./scripts/switch-frontend-color.sh blue
```

Replace `blue` with `green` as needed.
