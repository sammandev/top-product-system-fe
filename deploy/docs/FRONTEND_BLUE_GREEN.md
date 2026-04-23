# Frontend Blue-Green Deployment

This frontend repo now includes the release-slot assets for a blue-green rollout modeled on the PTB_OT frontend deployment pattern.

This implementation is intentionally frontend-only for the first phase:

- Public frontend entry stays at `172.18.220.56:9090`.
- Backend stays stable at `172.18.220.56:7070`.
- Internal frontend slot traffic uses Docker-network port `19090` only and is never exposed publicly.
- Port `8008` is not used anywhere in the top-product-system deployment flow.
- The shared edge proxy and active-color state do **not** live in this repo because frontend and backend are split across repositories.

## Canonical Frontend Files

- `deploy/compose/docker-compose.blue-green.yml`
- `deploy/docker/Dockerfile.blue-green`
- `deploy/nginx/nginx.blue-green.conf`
- `deploy/scripts/bootstrap-ubuntu-worktrees.sh`
- `deploy/scripts/deploy-blue-green.sh`
- `deploy/scripts/deploy-primevue.sh`
- `.env.production.example`

## Separate Edge-Proxy Home

The deployment script expects a separate server-side edge-proxy home that owns host port `9090` and tracks the active frontend color.

Recommended operator variable:

```bash
export TOP_PRODUCT_EDGE_DIR=/srv/top-product-deployment/edge-proxy
```

If your deploy user cannot write under `/srv`, use a writable sibling path under `/data/ptb/TOP_PROD` instead:

```bash
export TOP_PRODUCT_EDGE_DIR=/data/ptb/TOP_PROD/deployment-infra/edge-proxy
```

Optional network override:

```bash
export TOP_PRODUCT_EDGE_NETWORK=ast-tools-edge
```

The script will also auto-detect these common sibling paths when present:

- `../top-product-deployment/edge-proxy`
- `../deployment-infra/edge-proxy`

## Bootstrapping Edge Proxy

The frontend release containers only expose port `19090` on the shared Docker network. Public traffic at `172.18.220.56:9090` is owned by the separate edge proxy, so the site will not become reachable until that edge-proxy home exists and is started.

This repo now includes a server template under `deploy/server-template/edge-proxy`.

Recommended one-time Ubuntu setup:

```bash
mkdir -p /data/ptb/TOP_PROD/deployment-infra
rm -rf /data/ptb/TOP_PROD/deployment-infra/edge-proxy
cp -r /data/ptb/TOP_PROD/top-product-system-fe/deploy/server-template/edge-proxy /data/ptb/TOP_PROD/deployment-infra/edge-proxy

cd /data/ptb/TOP_PROD/deployment-infra/edge-proxy
bash ./scripts/bootstrap-edge.sh
```

That creates the shared Docker network when needed, starts the public Nginx edge proxy on port `9090`, and initializes frontend upstream state.

Important: this edge-proxy template now sets an explicit Docker Compose project name so it does not collide with PTB_OT. Without that, two different folders both named `edge-proxy` can share the same default Compose project identity and Docker may try to recreate the wrong proxy container.

Useful operator commands:

```bash
cd /srv/top-product-deployment/edge-proxy
bash ./scripts/status.sh
bash ./scripts/switch-frontend-color.sh blue
bash ./scripts/switch-frontend-color.sh green
```

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

## Safer Server Worktrees

For your current Ubuntu server layout, keep the existing folder on PrimeVue `main` and keep Vuetify in a separate fallback worktree beside it.

Exact commands:

```bash
cd /data/ptb/TOP_PROD/top-product-system-fe
git fetch origin --prune
git switch main
git pull --ff-only origin main

if [ ! -d ../top-product-system-fe-vuetify ]; then
  git worktree add ../top-product-system-fe-vuetify origin/original-vuetify
fi

cd /data/ptb/TOP_PROD/top-product-system-fe-vuetify

if git show-ref --verify --quiet refs/heads/original-vuetify; then
  git switch original-vuetify
else
  git switch -c original-vuetify --track origin/original-vuetify
fi

git pull --ff-only origin original-vuetify
```

If you already created the Vuetify worktree with:

```bash
git worktree add ../top-product-system-fe-vuetify origin/original-vuetify
```

then Git leaves that worktree on a detached HEAD. Convert it to a normal tracking branch with:

```bash
cd /data/ptb/TOP_PROD/top-product-system-fe-vuetify

if git show-ref --verify --quiet refs/heads/original-vuetify; then
  git switch original-vuetify
else
  git switch -c original-vuetify --track origin/original-vuetify
fi
```

PrimeVue deployment preparation remains in the existing folder:

```bash
cd /data/ptb/TOP_PROD/top-product-system-fe
git config core.filemode false
git fetch origin --prune
git switch main
git pull --ff-only origin main
cp .env.production.example .env.production
nano .env.production
chmod +x ./deploy/scripts/deploy-blue-green.sh
```

You can automate the server worktree layout with:

```bash
cd /data/ptb/TOP_PROD/top-product-system-fe
./deploy/scripts/bootstrap-ubuntu-worktrees.sh
```

Recommended meaning of each folder:

- `/data/ptb/TOP_PROD/top-product-system-fe` stays on `main` and is the only checkout that should run `deploy-blue-green.sh`.
- `/data/ptb/TOP_PROD/top-product-system-fe-vuetify` stays on `original-vuetify` for fallback reference or rollback preparation.

Routine update commands for the PrimeVue deployment checkout:

```bash
cd /data/ptb/TOP_PROD/top-product-system-fe
git fetch origin --prune
git pull --ff-only origin main
export TOP_PRODUCT_EDGE_DIR=/srv/top-product-deployment/edge-proxy
set -a
source .env.production
set +a
./deploy/scripts/deploy-blue-green.sh
```

To force operators through the canonical PrimeVue checkout even when they are currently in the wrong directory, use the wrapper script:

```bash
cd /data/ptb/TOP_PROD/top-product-system-fe
./deploy/scripts/deploy-primevue.sh
```

The wrapper always changes into `/data/ptb/TOP_PROD/top-product-system-fe` before it invokes `deploy-blue-green.sh`, and it refuses to continue if that canonical checkout is not currently on `main`.

If the deployed branch on Ubuntu does not yet preserve executable bits for these scripts, prefer invoking them with `bash ...` instead of `chmod +x ...`. Using `chmod` on a tracked non-executable script makes the git tree look dirty and the deploy preflight will refuse to continue.

For existing server checkouts, run this once in each frontend worktree to ignore chmod-only changes:

```bash
git config core.filemode false
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
