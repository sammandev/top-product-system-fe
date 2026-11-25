#!/bin/bash

# Frontend staging deploy (build + start)
# Usage: ./deploy-staging.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "🚀 Deploying frontend (staging)..."

docker compose -f docker-compose.staging.yml up -d --pull always --build
echo "⏳ Waiting for nginx..."
if command -v curl >/dev/null 2>&1; then
  timeout 60 bash -c 'until curl -fsS http://localhost:9090/ > /dev/null 2>&1; do sleep 2; done'
else
  echo "⚠️ curl not found; skipping health wait"
fi

echo "✅ Frontend staging deploy complete"
