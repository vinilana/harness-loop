#!/usr/bin/env sh
set -eu

HOOK_NAME="${1:-unknown}"
LOG_FILE="${CODEX_HOOK_LOG_FILE:-/home/aicoders/workspace/harness-loop/hooks-log.txt}"

{
  echo "===== $(date -Is) [$HOOK_NAME] ====="
  cat
  echo
} >> "$LOG_FILE" 2>&1
