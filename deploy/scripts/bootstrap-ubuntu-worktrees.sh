#!/bin/bash

set -euo pipefail

CANONICAL_FRONTEND_DIR="${TOP_PRODUCT_FRONTEND_MAIN_DIR:-/data/ptb/TOP_PROD/top-product-system-fe}"
VUETIFY_WORKTREE_DIR="${TOP_PRODUCT_FRONTEND_VUETIFY_DIR:-/data/ptb/TOP_PROD/top-product-system-fe-vuetify}"
REMOTE_MAIN_BRANCH="${TOP_PRODUCT_FRONTEND_MAIN_BRANCH:-main}"
REMOTE_VUETIFY_BRANCH="${TOP_PRODUCT_FRONTEND_VUETIFY_BRANCH:-original-vuetify}"

usage() {
  echo "Usage: ./bootstrap-ubuntu-worktrees.sh"
  echo
  echo "Default layout:"
  echo "  PrimeVue checkout : $CANONICAL_FRONTEND_DIR"
  echo "  Vuetify worktree  : $VUETIFY_WORKTREE_DIR"
  echo
  echo "Optional environment overrides:"
  echo "  TOP_PRODUCT_FRONTEND_MAIN_DIR"
  echo "  TOP_PRODUCT_FRONTEND_VUETIFY_DIR"
  echo "  TOP_PRODUCT_FRONTEND_MAIN_BRANCH"
  echo "  TOP_PRODUCT_FRONTEND_VUETIFY_BRANCH"
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

ensure_directory_exists() {
  local path="$1"

  if [ ! -d "$path" ]; then
    echo "Required directory does not exist: $path"
    exit 1
  fi
}

ensure_git_worktree() {
  local path="$1"

  if ! git -C "$path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Expected a git worktree at: $path"
    exit 1
  fi
}

ensure_branch_up_to_date() {
  local path="$1"
  local branch="$2"

  git -C "$path" fetch origin --prune

  if git -C "$path" show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$path" switch "$branch"
  else
    git -C "$path" switch -c "$branch" --track "origin/$branch"
  fi

  git -C "$path" pull --ff-only origin "$branch"
}

ensure_vuetify_worktree() {
  if [ ! -d "$VUETIFY_WORKTREE_DIR" ]; then
    git -C "$CANONICAL_FRONTEND_DIR" worktree add "$VUETIFY_WORKTREE_DIR" "origin/$REMOTE_VUETIFY_BRANCH"
  fi

  ensure_git_worktree "$VUETIFY_WORKTREE_DIR"
  ensure_branch_up_to_date "$VUETIFY_WORKTREE_DIR" "$REMOTE_VUETIFY_BRANCH"
}

ensure_directory_exists "$CANONICAL_FRONTEND_DIR"
ensure_git_worktree "$CANONICAL_FRONTEND_DIR"
git -C "$CANONICAL_FRONTEND_DIR" config core.filemode false
ensure_branch_up_to_date "$CANONICAL_FRONTEND_DIR" "$REMOTE_MAIN_BRANCH"
ensure_vuetify_worktree
git -C "$VUETIFY_WORKTREE_DIR" config core.filemode false

echo "Ubuntu frontend worktrees are ready"
echo "PrimeVue checkout : $CANONICAL_FRONTEND_DIR"
echo "Vuetify worktree  : $VUETIFY_WORKTREE_DIR"
