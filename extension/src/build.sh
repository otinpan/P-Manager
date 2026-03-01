#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MANIFEST_JSON="${REPO_ROOT}/extension/manifest.json"
NATIVE_DIST_DIR="${REPO_ROOT}/extension/dist"

get_windows_local_app_data() {
  local value=""
  if [[ -n "${WIN_LOCALAPPDATA:-}" ]]; then
    echo "${WIN_LOCALAPPDATA}"
    return
  fi
  if command -v cmd.exe >/dev/null 2>&1; then
    value="$(cmd.exe /C "echo %LOCALAPPDATA%" 2>/dev/null | tr -d '\r' | tail -n 1)"
    if [[ -n "${value}" && "${value}" != "%LOCALAPPDATA%" ]]; then
      echo "${value}"
      return
    fi
  fi
  if command -v powershell.exe >/dev/null 2>&1; then
    value="$(powershell.exe -NoProfile -Command "[Environment]::GetFolderPath('LocalApplicationData')" 2>/dev/null | tr -d '\r' | tail -n 1)"
    if [[ -n "${value}" ]]; then
      echo "${value}"
      return
    fi
  fi
  echo "could not resolve Windows LOCALAPPDATA from WSL. Set WIN_LOCALAPPDATA, e.g. C:\\Users\\<User>\\AppData\\Local" >&2
  return 1
}

to_wsl_path() {
  local p="$1"
  if command -v wslpath >/dev/null 2>&1; then
    wslpath -u "$p"
    return
  fi
  if [[ "$p" =~ ^([A-Za-z]):\\(.*)$ ]]; then
    local drive="${BASH_REMATCH[1],,}"
    local rest="${BASH_REMATCH[2]//\\//}"
    printf '/mnt/%s/%s\n' "$drive" "$rest"
    return
  fi
  echo "Unsupported Windows path format: $p" >&2
  return 1
}

WIN_LOCALAPPDATA="$(get_windows_local_app_data)"
WINDOWS_DEST_DIR="$(to_wsl_path "${WIN_LOCALAPPDATA}\\PManager")"

cd "${SCRIPT_DIR}"
mkdir -p ../dist/background ../dist/content

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
