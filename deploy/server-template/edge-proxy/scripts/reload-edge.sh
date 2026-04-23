#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EDGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$EDGE_DIR/docker-compose.yml"

bash "$SCRIPT_DIR/ensure-network.sh"

echo "Ensuring edge proxy container matches current compose config"
docker compose -f "$COMPOSE_FILE" up -d edge-proxy

docker compose -f "$COMPOSE_FILE" exec -T edge-proxy nginx -t
docker compose -f "$COMPOSE_FILE" exec -T edge-proxy nginx -s reload

echo "Edge proxy reloaded"