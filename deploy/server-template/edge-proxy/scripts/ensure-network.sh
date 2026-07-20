#!/bin/bash

set -euo pipefail

NETWORK_NAME="${TOP_PRODUCT_EDGE_NETWORK:-ast-tools-edge}"
NETWORK_SUBNET="${TOP_PRODUCT_EDGE_SUBNET:-172.19.0.0/16}"

if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  echo "Network '$NETWORK_NAME' already exists"
  exit 0
fi

echo "Creating Docker network '$NETWORK_NAME'"
docker network create --driver bridge --subnet "$NETWORK_SUBNET" "$NETWORK_NAME" >/dev/null
echo "Network '$NETWORK_NAME' created"