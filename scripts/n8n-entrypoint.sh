#!/bin/sh
# Устанавливаем кастомную ноду в ~/.n8n/nodes (manual install) один раз, затем запускаем n8n.

NODES_DIR="/home/node/.n8n/nodes"
CUSTOM_PKG="/home/node/.n8n/custom-nodes/n8n-nodes-yandex-speechkit"
MARKER="$NODES_DIR/node_modules/n8n-nodes-yandex-speechkit/package.json"

echo "[entrypoint] Starting. CUSTOM_PKG exists: $(test -f "$CUSTOM_PKG/package.json" && echo yes || echo no). Marker exists: $(test -f "$MARKER" && echo yes || echo no)."

if [ -f "$CUSTOM_PKG/package.json" ] && [ ! -f "$MARKER" ]; then
  echo "[entrypoint] Installing community node from $CUSTOM_PKG (one-time)..."
  mkdir -p "$NODES_DIR"
  cd "$NODES_DIR"
  if [ ! -f package.json ]; then
    npm init -y
  fi
  npm install "$CUSTOM_PKG" --omit=dev --no-package-lock && echo "[entrypoint] Install OK." || echo "[entrypoint] Install failed (continuing anyway)."
  cd - >/dev/null
else
  echo "[entrypoint] Skip install (already installed or no package)."
fi

echo "[entrypoint] Executing: $*"
exec "$@"
