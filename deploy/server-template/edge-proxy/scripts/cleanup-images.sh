#!/bin/bash

set -euo pipefail

TARGET="${1:-frontend}"

case "$TARGET" in
  frontend|all)
    ;;
  *)
    echo "Usage: $0 [frontend|all]"
    exit 1
    ;;
esac

echo "Pruning dangling top-product frontend images"
docker image prune -f --filter 'dangling=true' --filter 'label=com.ast-tools.project=top-product' --filter 'label=com.ast-tools.service=frontend'

echo "Image cleanup complete"