#!/bin/sh
# Устанавливаем кастомную ноду в ~/.n8n/nodes (manual install), затем запускаем n8n.

set -e

NODES_DIR="/home/node/.n8n/nodes"
CUSTOM_PKG="/home/node/.n8n/custom-nodes/n8n-nodes-yandex-speechkit"

if [ -f "$CUSTOM_PKG/package.json" ]; then
  mkdir -p "$NODES_DIR"
  cd "$NODES_DIR"
  if [ ! -f package.json ]; then
    npm init -y
  fi
  echo "Installing community node from $CUSTOM_PKG..."
  npm install "$CUSTOM_PKG" --no-package-lock 2>/dev/null || true
  cd - >/dev/null
fi

exec "$@"
