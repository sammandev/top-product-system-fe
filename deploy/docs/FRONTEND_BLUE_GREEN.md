# Frontend Blue-Green Deployment

This is the production deployment flow for `top-product-system-fe`.

## Ports

- Public frontend: `http://10.176.2.139:9090`
- Public backend: `http://10.176.2.139:7070`
- Internal frontend slot port: `19090`

The top-product deployment does not use public ports `3333` or `8008`.

## Layout

The scripts derive the checkout from their own location, so the repository can
live under any parent directory. The default layout is:

- PrimeVue checkout: the current repository directory
- Optional Vuetify fallback worktree: one sibling directory named `<project>-vuetify`
- Shared edge proxy home: one sibling `deployment-infra/edge-proxy` directory

The frontend repo owns the release image, the blue-green deploy scripts, and the edge-proxy template.

## One-Time Setup

### 1. Prepare the PrimeVue checkout

```bash
cd /path/to/top-product-system-fe
git config core.filemode false
git fetch origin --prune
git switch main
git pull --ff-only origin main
cp .env.production.example .env.production
nano .env.production
```

### 2. Optional Vuetify fallback worktree

```bash
FRONTEND_DIR="$(cd /path/to/top-product-system-fe && pwd)"

bash "$FRONTEND_DIR/deploy/scripts/bootstrap-ubuntu-worktrees.sh"

VUETIFY_DIR="$(dirname "$FRONTEND_DIR")/$(basename "$FRONTEND_DIR")-vuetify"
cd "$VUETIFY_DIR"
git config core.filemode false

if git show-ref --verify --quiet refs/heads/original-vuetify; then
  git switch original-vuetify
else
  git switch -c original-vuetify --track origin/original-vuetify
fi

git pull --ff-only origin original-vuetify
```

### 3. Edge proxy

The edge proxy owns public port `9090`. The deployment scripts automatically
create the default sibling directory from the repository template when it does
not exist. The following commands are optional if you want to initialize or
inspect it before the first deployment.

```bash
FRONTEND_DIR="$(cd /path/to/top-product-system-fe && pwd)"
EDGE_DIR="$(dirname "$FRONTEND_DIR")/deployment-infra/edge-proxy"
mkdir -p "$(dirname "$EDGE_DIR")"
rm -rf "$EDGE_DIR"
cp -r "$FRONTEND_DIR/deploy/server-template/edge-proxy" "$EDGE_DIR"

cd "$EDGE_DIR"
bash ./scripts/bootstrap-edge.sh
bash ./scripts/status.sh
```

Notes:

- The edge-proxy template has its own Docker Compose project name, so it does not collide with PTB_OT.
- Run the edge-proxy helper scripts with `bash ...` on Ubuntu. That avoids executable-bit noise in git.

## Deploy

Use the PrimeVue checkout only.

```bash
cd /path/to/top-product-system-fe

export TOP_PRODUCT_EDGE_DIR="$(dirname "$(pwd)")/deployment-infra/edge-proxy"
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
FRONTEND_DIR="$(cd /path/to/top-product-system-fe && pwd)"
EDGE_DIR="$(dirname "$FRONTEND_DIR")/deployment-infra/edge-proxy"
cd "$EDGE_DIR"
bash ./scripts/status.sh

curl -I http://10.176.2.139:9090/healthz
curl -I http://10.176.2.139:9090/
```

You should see:

- `ast-tools-edge-proxy` running on `9090`
- either `ast-tools-frontend-blue` or `ast-tools-frontend-green` healthy
- `status.sh` showing the same active color as the running frontend slot
- `curl /healthz` returns `200`

## Rollback

Rollback is only a proxy switch. No rebuild is required.

```bash
cd deployment-infra/edge-proxy
bash ./scripts/switch-frontend-color.sh blue
bash ./scripts/switch-frontend-color.sh green
```

Use the color that points to the last known good frontend slot.

## Common Issues

### `502 Bad Gateway` on `9090`

Usually means the edge proxy is pointing at a missing or unhealthy slot. Run:

```bash
cd deployment-infra/edge-proxy
bash ./scripts/status.sh
```

### `Missing switch-frontend-color.sh`

The edge-proxy home could not be created from the repository template, or you
pointed `TOP_PRODUCT_EDGE_DIR` at the wrong path.

### Dirty git tree during deploy

Run this once in each frontend worktree:

```bash
git config core.filemode false
```

### PTB_OT containers appear as orphans

Pull the latest `main` for `top-product-system-fe`. The top-product blue-green compose file now uses its own explicit project name.
