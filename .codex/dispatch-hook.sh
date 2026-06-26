#!/usr/bin/env sh
# Codex hook entrypoint: dispatch stdin JSON to Hook Loop Lab + local log.
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec node "$SCRIPT_DIR/dispatch-hook.mjs" "${1:-unknown}"
