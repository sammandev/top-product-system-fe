#!/bin/bash

set -euo pipefail

COLOR="${1:-}"

if [[ "$COLOR" != "blue" && "$COLOR" != "green" ]]; then
  echo "Usage: $0 [blue|green]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EDGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
UPSTREAM_FILE="$EDGE_DIR/nginx/upstreams/frontend.active.conf"
STATE_DIR="$EDGE_DIR/state"
TARGET_CONTAINER="ast-tools-frontend-${COLOR}"

container_health() {
  docker inspect -f '{{.State.Status}}{{if .State.Health}} {{.State.Health.Status}}{{end}}' "$1" 2>/dev/null || true
}

TARGET_HEALTH="$(container_health "$TARGET_CONTAINER")"

mkdir -p "$STATE_DIR"

if [[ -z "$TARGET_HEALTH" ]]; then
  echo "Target frontend container '$TARGET_CONTAINER' does not exist"
  exit 1
fi

if [[ "$TARGET_HEALTH" != "running healthy" ]]; then
  echo "Target frontend container '$TARGET_CONTAINER' is not healthy: $TARGET_HEALTH"
  exit 1
fi

cat > "$UPSTREAM_FILE" <<EOF
map \$server_port \$frontend_upstream {
  default ast-tools-frontend-${COLOR}:19090;
}
EOF

bash "$SCRIPT_DIR/reload-edge.sh"
echo "$COLOR" > "$STATE_DIR/frontend.color"

echo "Frontend traffic switched to $COLOR"