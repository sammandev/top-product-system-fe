#!/bin/bash

set -euo pipefail

CANONICAL_FRONTEND_DIR="${TOP_PRODUCT_FRONTEND_MAIN_DIR:-/data/ptb/TOP_PROD/top-product-system-fe}"
DEPLOY_SCRIPT_RELATIVE="deploy/scripts/deploy-blue-green.sh"

usage() {
  echo "Usage: ./deploy-primevue.sh [deploy-blue-green args]"
  echo
  echo "This wrapper always deploys from the canonical PrimeVue checkout:"
  echo "  $CANONICAL_FRONTEND_DIR"
  echo
  echo "Optional environment override:"
  echo "  TOP_PRODUCT_FRONTEND_MAIN_DIR"
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ ! -d "$CANONICAL_FRONTEND_DIR" ]; then
  echo "Canonical PrimeVue checkout does not exist: $CANONICAL_FRONTEND_DIR"
  exit 1
fi

if ! git -C "$CANONICAL_FRONTEND_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Canonical PrimeVue checkout is not a git worktree: $CANONICAL_FRONTEND_DIR"
  exit 1
fi

BRANCH_NAME="$(git -C "$CANONICAL_FRONTEND_DIR" branch --show-current || true)"
if [ "$BRANCH_NAME" != "main" ]; then
  echo "Refusing to deploy because the canonical checkout is not on main."
  echo "Current branch: ${BRANCH_NAME:-detached}"
  exit 1
fi

DEPLOY_SCRIPT="$CANONICAL_FRONTEND_DIR/$DEPLOY_SCRIPT_RELATIVE"

if [ ! -x "$DEPLOY_SCRIPT" ]; then
  echo "Missing executable deploy script: $DEPLOY_SCRIPT"
  echo "Run: chmod +x $DEPLOY_SCRIPT"
  exit 1
fi

cd "$CANONICAL_FRONTEND_DIR"
exec bash "$DEPLOY_SCRIPT" "$@"
