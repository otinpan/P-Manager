#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOST_MANIFEST_JSON="${REPO_ROOT}/p_manager_host_chrome.json"

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

if [[ ! -f "${HOST_MANIFEST_JSON}" ]]; then
  echo "Host manifest not found: ${HOST_MANIFEST_JSON}" >&2
  exit 1
fi

WIN_LOCALAPPDATA="$(get_windows_local_app_data)"
WIN_PM_DIR="${WIN_LOCALAPPDATA}\\PManager"
WIN_HOST_EXE="${WIN_PM_DIR}\\bin\\native-host.exe"
WINDOWS_DEST_DIR="$(to_wsl_path "${WIN_PM_DIR}")"

TMP_MANIFEST="$(mktemp)"
trap 'rm -f "${TMP_MANIFEST}"' EXIT

WIN_HOST_EXE_ESCAPED="${WIN_HOST_EXE//\\/\\\\}"
awk -v p="${WIN_HOST_EXE_ESCAPED}" '
  {
    if ($0 ~ /"path"[[:space:]]*:/) {
      sub(/"path"[[:space:]]*:[[:space:]]*"[^"]*"/, "\"path\": \"" p "\"")
    }
    print
  }
' "${HOST_MANIFEST_JSON}" > "${TMP_MANIFEST}"

mkdir -p "${WINDOWS_DEST_DIR}"
cp -f "${TMP_MANIFEST}" "${WINDOWS_DEST_DIR}/p_manager_host_chrome.json"
echo "Copied to ${WINDOWS_DEST_DIR}/p_manager_host_chrome.json"
echo "Manifest path is set to ${WIN_HOST_EXE}"
