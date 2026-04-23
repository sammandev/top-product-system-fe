# Frontend Blue-Green Deployment

This is the production deployment flow for `top-product-system-fe`.

## Ports

- Public frontend: `http://172.18.220.56:9090`
- Public backend: `http://172.18.220.56:7070`
- Internal frontend slot port: `19090`

The top-product deployment does not use public ports `3333` or `8008`.

## Layout

Use this server layout:

- PrimeVue checkout: `/data/ptb/TOP_PROD/top-product-system-fe`
- Optional Vuetify fallback worktree: `/data/ptb/TOP_PROD/top-product-system-fe-vuetify`
- Shared edge proxy home: `/data/ptb/TOP_PROD/deployment-infra/edge-proxy`

The frontend repo owns the release image, the blue-green deploy scripts, and the edge-proxy template.

## One-Time Setup

### 1. Prepare the PrimeVue checkout

```bash
cd /data/ptb/TOP_PROD/top-product-system-fe
git config core.filemode false
git fetch origin --prune
git switch main
git pull --ff-only origin main
cp .env.production.example .env.production
nano .env.production
```

### 2. Optional Vuetify fallback worktree

```bash
cd /data/ptb/TOP_PROD/top-product-system-fe

if [ ! -d ../top-product-system-fe-vuetify ]; then
  git worktree add ../top-product-system-fe-vuetify origin/original-vuetify
fi

cd /data/ptb/TOP_PROD/top-product-system-fe-vuetify
git config core.filemode false

if git show-ref --verify --quiet refs/heads/original-vuetify; then
  git switch original-vuetify
else
  git switch -c original-vuetify --track origin/original-vuetify
fi

git pull --ff-only origin original-vuetify
```

### 3. Bootstrap the edge proxy

The edge proxy owns public port `9090`. Until it exists, the frontend will not be reachable even if a blue or green slot is healthy.

```bash
mkdir -p /data/ptb/TOP_PROD/deployment-infra
rm -rf /data/ptb/TOP_PROD/deployment-infra/edge-proxy
cp -r /data/ptb/TOP_PROD/top-product-system-fe/deploy/server-template/edge-proxy /data/ptb/TOP_PROD/deployment-infra/edge-proxy

cd /data/ptb/TOP_PROD/deployment-infra/edge-proxy
bash ./scripts/bootstrap-edge.sh
bash ./scripts/status.sh
```

Notes:

- The edge-proxy template has its own Docker Compose project name, so it does not collide with PTB_OT.
- Run the edge-proxy helper scripts with `bash ...` on Ubuntu. That avoids executable-bit noise in git.

## Deploy

Use the PrimeVue checkout only.

```bash
cd /data/ptb/TOP_PROD/top-product-system-fe

export TOP_PRODUCT_EDGE_DIR=/data/ptb/TOP_PROD/deployment-infra/edge-proxy
export TOP_PRODUCT_EDGE_NETWORK=ast-tools-edge

git fetch origin --prune
git pull --ff-only origin main

set -a
source .env.production
set +a

bash ./deploy/scripts/deploy-primevue.sh
```

This will:

- build the inactive frontend slot
- wait for it to become healthy
- switch the edge proxy to the new slot
- optionally stop the old slot

Optional flags:

- `--skip-build`
- `--keep-old`
- `--skip-cleanup`

Example:

```bash
bash ./deploy/scripts/deploy-primevue.sh --keep-old
```

## Check

```bash
cd /data/ptb/TOP_PROD/deployment-infra/edge-proxy
bash ./scripts/status.sh

curl -I http://172.18.220.56:9090/healthz
curl -I http://172.18.220.56:9090/
```

You should see:

- `ast-tools-edge-proxy` running on `9090`
- either `ast-tools-frontend-blue` or `ast-tools-frontend-green` healthy
- `status.sh` showing the same active color as the running frontend slot
- `curl /healthz` returns `200`

## Rollback

Rollback is only a proxy switch. No rebuild is required.

```bash
cd /data/ptb/TOP_PROD/deployment-infra/edge-proxy
bash ./scripts/switch-frontend-color.sh blue
bash ./scripts/switch-frontend-color.sh green
```

Use the color that points to the last known good frontend slot.

## Common Issues

### `502 Bad Gateway` on `9090`

Usually means the edge proxy is pointing at a missing or unhealthy slot. Run:

```bash
cd /data/ptb/TOP_PROD/deployment-infra/edge-proxy
bash ./scripts/status.sh
```

### `Missing switch-frontend-color.sh`

The edge-proxy home was not bootstrapped or you pointed `TOP_PRODUCT_EDGE_DIR` at the wrong path.

### Dirty git tree during deploy

Run this once in each frontend worktree:

```bash
git config core.filemode false
```

### PTB_OT containers appear as orphans

Pull the latest `main` for `top-product-system-fe`. The top-product blue-green compose file now uses its own explicit project name.
