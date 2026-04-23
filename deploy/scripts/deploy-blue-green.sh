#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$FRONTEND_DIR/deploy/compose/docker-compose.blue-green.yml"

EDGE_DIR="${TOP_PRODUCT_EDGE_DIR:-}"
EDGE_NETWORK="${TOP_PRODUCT_EDGE_NETWORK:-ast-tools-edge}"

SKIP_BUILD=false
KEEP_OLD=false
SKIP_CLEANUP=false

for arg in "$@"; do
  case "$arg" in
    --skip-build)
      SKIP_BUILD=true
      ;;
    --keep-old)
      KEEP_OLD=true
      ;;
    --skip-cleanup)
      SKIP_CLEANUP=true
      ;;
    -h|--help)
      echo "Usage: ./deploy-blue-green.sh [--skip-build] [--keep-old] [--skip-cleanup]"
      echo "Environment: TOP_PRODUCT_EDGE_DIR=/path/to/edge-proxy TOP_PRODUCT_EDGE_NETWORK=${EDGE_NETWORK}"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      exit 1
      ;;
  esac
done

discover_edge_dir() {
  local candidate

  if [ -n "$EDGE_DIR" ]; then
    echo "$EDGE_DIR"
    return
  fi

  for candidate in \
    "$FRONTEND_DIR/../top-product-deployment/edge-proxy" \
    "$FRONTEND_DIR/../deployment-infra/edge-proxy"
  do
    if [ -d "$candidate" ]; then
      echo "$candidate"
      return
    fi
  done
}

EDGE_DIR="$(discover_edge_dir || true)"

if [ -z "$EDGE_DIR" ]; then
  echo "Unable to locate the shared edge-proxy home."
  echo "Set TOP_PRODUCT_EDGE_DIR to the separate deployment-infra edge-proxy path."
  exit 1
fi

EDGE_SCRIPT_DIR="$EDGE_DIR/scripts"
STATE_FILE="$EDGE_DIR/state/frontend.color"

get_active_color() {
  if [ -f "$STATE_FILE" ]; then
    local color
    color="$(tr -d '[:space:]' < "$STATE_FILE")"
    if [[ "$color" == "blue" || "$color" == "green" ]]; then
      echo "$color"
      return
    fi
  fi
}

get_target_color() {
  local active_color="${1:-}"

  if [ -z "$active_color" ]; then
    echo "blue"
  elif [ "$active_color" = "blue" ]; then
    echo "green"
  else
    echo "blue"
  fi
}

wait_for_health() {
  local container_name="$1"

  for _ in {1..30}; do
    if [ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_name" 2>/dev/null || true)" = "healthy" ]; then
      return 0
    fi
    sleep 2
  done

  return 1
}

ensure_edge_network() {
  if [ -x "$EDGE_SCRIPT_DIR/ensure-network.sh" ]; then
    TOP_PRODUCT_EDGE_NETWORK="$EDGE_NETWORK" bash "$EDGE_SCRIPT_DIR/ensure-network.sh"
    return
  fi

  docker network inspect "$EDGE_NETWORK" >/dev/null 2>&1 || docker network create "$EDGE_NETWORK" >/dev/null
}

switch_frontend_color() {
  if [ ! -x "$EDGE_SCRIPT_DIR/switch-frontend-color.sh" ]; then
    echo "Missing switch-frontend-color.sh in $EDGE_SCRIPT_DIR"
    exit 1
  fi

  TOP_PRODUCT_EDGE_NETWORK="$EDGE_NETWORK" bash "$EDGE_SCRIPT_DIR/switch-frontend-color.sh" "$1"
}

cleanup_frontend_images() {
  if [ -x "$EDGE_SCRIPT_DIR/cleanup-images.sh" ]; then
    bash "$EDGE_SCRIPT_DIR/cleanup-images.sh" frontend
    return
  fi

  docker image prune -f --filter 'label=com.ast-tools.project=top-product' >/dev/null 2>&1 || true
}

ACTIVE_COLOR="$(get_active_color || true)"
TARGET_COLOR="$(get_target_color "$ACTIVE_COLOR")"
TARGET_SERVICE="frontend-$TARGET_COLOR"
TARGET_CONTAINER="ast-tools-frontend-$TARGET_COLOR"

echo "Preparing frontend blue-green deployment"
echo "Edge proxy home: $EDGE_DIR"
echo "Active color: ${ACTIVE_COLOR:-none}"
echo "Target color: $TARGET_COLOR"
echo "Backend API URL for this build: ${VITE_API_BASE_URL:-http://172.18.220.56:7070}"

ensure_edge_network

if [ "$SKIP_BUILD" = false ]; then
  docker compose -f "$COMPOSE_FILE" build "$TARGET_SERVICE"
fi

docker compose -f "$COMPOSE_FILE" up -d "$TARGET_SERVICE"

if ! wait_for_health "$TARGET_CONTAINER"; then
  echo "Target frontend failed health check"
  docker compose -f "$COMPOSE_FILE" logs --tail=80 "$TARGET_SERVICE"
  exit 1
fi

switch_frontend_color "$TARGET_COLOR"

if [ -n "$ACTIVE_COLOR" ] && [ "$KEEP_OLD" = false ]; then
  docker compose -f "$COMPOSE_FILE" stop "frontend-$ACTIVE_COLOR" >/dev/null 2>&1 || true
  docker compose -f "$COMPOSE_FILE" rm -f "frontend-$ACTIVE_COLOR" >/dev/null 2>&1 || true
fi

if [ "$SKIP_CLEANUP" = false ]; then
  cleanup_frontend_images
fi

echo "Frontend blue-green deployment completed"