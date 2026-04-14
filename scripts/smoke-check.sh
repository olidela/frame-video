#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Smoke check for frame-video"
echo

python3 -m py_compile "$ROOT_DIR/server.py"
echo "[OK] Python syntax"

node --check "$ROOT_DIR/app.js"
echo "[OK] JavaScript syntax"

grep -Fq 'id="extract-form"' "$ROOT_DIR/index.html"
grep -Fq 'id="select-video-button"' "$ROOT_DIR/index.html"
grep -Fq 'id="preview-grid"' "$ROOT_DIR/index.html"
echo "[OK] HTML hooks principais"

grep -Fq '.file-picker-button' "$ROOT_DIR/styles.css"
grep -Fq '.preview-grid' "$ROOT_DIR/styles.css"
echo "[OK] CSS selectors principais"

echo
echo "Resultado: CONFORME"
