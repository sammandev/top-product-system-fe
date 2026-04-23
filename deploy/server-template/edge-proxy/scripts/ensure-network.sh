#!/bin/bash

set -euo pipefail

NETWORK_NAME="${TOP_PRODUCT_EDGE_NETWORK:-ast-tools-edge}"

if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  echo "Network '$NETWORK_NAME' already exists"
  exit 0
fi

echo "Creating Docker network '$NETWORK_NAME'"
docker network create "$NETWORK_NAME" >/dev/null
echo "Network '$NETWORK_NAME' created"