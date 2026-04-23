#!/bin/bash

set -euo pipefail

DEFAULT_COLOR="${1:-blue}"

if [[ "$DEFAULT_COLOR" != "blue" && "$DEFAULT_COLOR" != "green" ]]; then
  echo "Usage: $0 [blue|green]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EDGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
UPSTREAM_FILE="$EDGE_DIR/nginx/upstreams/frontend.active.conf"
STATE_FILE="$EDGE_DIR/state/frontend.color"

mkdir -p "$EDGE_DIR/state"

if [ ! -f "$STATE_FILE" ]; then
  echo "$DEFAULT_COLOR" > "$STATE_FILE"
fi

if [ ! -f "$UPSTREAM_FILE" ]; then
  cat > "$UPSTREAM_FILE" <<EOF
map \$server_port \$frontend_upstream {
    default ast-tools-frontend-${DEFAULT_COLOR}:19090;
}
EOF
fi

bash "$SCRIPT_DIR/reload-edge.sh"

echo "Edge proxy started"