#!/bin/bash

# Frontend code update (rebuild and restart)
# Usage: ./update-code.sh
#
# IMPORTANT: Run `git pull` manually before running this script.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "🔄 Updating frontend code..."
echo "=================================================="

# Check for uncommitted changes (informational)
if command -v git >/dev/null 2>&1 && [ -d ".git" ]; then
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo "⚠️  You have uncommitted local changes:"
        git status --short
        echo ""
    else
        echo "✅ Git working directory is clean"
    fi
fi

echo ""
echo "♻️  Rebuilding and restarting frontend containers..."
docker compose -f docker-compose.staging.yml up -d --build frontend nginx

echo ""
echo "⏳ Waiting for nginx..."
if command -v curl >/dev/null 2>&1; then
  timeout 60 bash -c 'until curl -fsS http://localhost:9090/ > /dev/null 2>&1; do sleep 2; done'
else
  echo "⚠️ curl not found; skipping health wait"
fi

echo ""
echo "✅ Frontend update complete!"
echo "=================================================="
