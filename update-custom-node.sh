#!/usr/bin/env bash
# Копирует сборку n8n-nodes-yandex-gpt в custom-nodes/ для коммита в репо.
# Запускать из корня lpsolutions после сборки ноды (npm run build в n8n-nodes-yandex-gpt).
set -e
SOURCE="${1:-../n8n-nodes-yandex-gpt}"
DEST="custom-nodes/n8n-nodes-yandex-gpt"
if [[ ! -f "$SOURCE/package.json" || ! -d "$SOURCE/dist" ]]; then
  echo "Ожидается: $SOURCE/package.json и $SOURCE/dist/"
  echo "Использование: $0 [путь/к/n8n-nodes-yandex-gpt]"
  exit 1
fi
mkdir -p "$DEST"
cp "$SOURCE/package.json" "$DEST/"
rm -rf "$DEST/dist"
cp -r "$SOURCE/dist" "$DEST/"
echo "Скопировано: package.json и dist/ -> $DEST/"
echo "Дальше: git add custom-nodes/ && git commit && git push"
