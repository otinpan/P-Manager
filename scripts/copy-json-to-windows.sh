#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOST_MANIFEST_JSON="${REPO_ROOT}/p_manager_host_chrome.json"
WINDOWS_DEST_DIR="/mnt/d/MyGame/P-Manager"

if [[ ! -f "${HOST_MANIFEST_JSON}" ]]; then
  echo "Host manifest not found: ${HOST_MANIFEST_JSON}" >&2
  exit 1
fi

mkdir -p "${WINDOWS_DEST_DIR}"
cp -f "${HOST_MANIFEST_JSON}" "${WINDOWS_DEST_DIR}/"
echo "Copied to ${WINDOWS_DEST_DIR}/p_manager_host_chrome.json"
