#!/bin/sh
# Устанавливаем кастомную ноду в ~/.n8n/nodes (manual install) один раз, затем запускаем n8n.

set -e

NODES_DIR="/home/node/.n8n/nodes"
CUSTOM_PKG="/home/node/.n8n/custom-nodes/n8n-nodes-yandex-speechkit"
MARKER="$NODES_DIR/node_modules/n8n-nodes-yandex-speechkit/package.json"

if [ -f "$CUSTOM_PKG/package.json" ] && [ ! -f "$MARKER" ]; then
  mkdir -p "$NODES_DIR"
  cd "$NODES_DIR"
  if [ ! -f package.json ]; then
    npm init -y
  fi
  echo "Installing community node from $CUSTOM_PKG (one-time)..."
  npm install "$CUSTOM_PKG" --omit=dev --no-package-lock || true
  cd - >/dev/null
fi

exec "$@"
