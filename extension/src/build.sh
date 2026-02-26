#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WINDOWS_DEST_DIR="/mnt/d/MyGame/P-Manager"
MANIFEST_JSON="${REPO_ROOT}/extension/manifest.json"
NATIVE_DIST_DIR="${REPO_ROOT}/extension/dist"

npx esbuild ./background/background.ts \
  --bundle --format=esm --platform=browser \
  --outfile=../dist/background/background.js

npx esbuild ./content/content.ts \
  --bundle --format=iife --platform=browser \
  --outfile=../dist/content/content.js

mkdir -p "${WINDOWS_DEST_DIR}"
cp -f "${MANIFEST_JSON}" "${WINDOWS_DEST_DIR}/manifest.json"
mkdir -p "${WINDOWS_DEST_DIR}/dist"
cp -a "${NATIVE_DIST_DIR}/." "${WINDOWS_DEST_DIR}/dist/"

echo "Copied manifest.json and target to ${WINDOWS_DEST_DIR}"
