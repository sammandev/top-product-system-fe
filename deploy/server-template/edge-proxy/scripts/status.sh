#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EDGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_FILE="$EDGE_DIR/state/frontend.color"

echo "Edge proxy: $(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' ast-tools-edge-proxy 2>/dev/null || echo missing)"
echo "Frontend blue: $(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' ast-tools-frontend-blue 2>/dev/null || echo missing)"
echo "Frontend green: $(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' ast-tools-frontend-green 2>/dev/null || echo missing)"
echo "Active color: $(tr -d '[:space:]' < "$STATE_FILE" 2>/dev/null || echo unknown)"