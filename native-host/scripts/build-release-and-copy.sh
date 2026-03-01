#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MANIFEST_PATH="${REPO_ROOT}/native-host/Cargo.toml"
TEMP_MANIFEST_PATH="${REPO_ROOT}/native-host/Cargo.build.tmp.toml"
TARGET="x86_64-pc-windows-gnu"
SRC_EXE="${REPO_ROOT}/native-host/target/${TARGET}/release/native-host.exe"

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
win_path="${WIN_LOCALAPPDATA}\\PManager\\bin\\native-host.exe"
dest_exe="$(to_wsl_path "${win_path}")"
dest_dir="$(dirname "${dest_exe}")"

cleanup() {
  rm -f "${TEMP_MANIFEST_PATH}"
}
trap cleanup EXIT

build_native_host() {
  if cargo build --release --target "${TARGET}" --manifest-path "${MANIFEST_PATH}"; then
    return 0
  fi

  if [[ -f "${REPO_ROOT}/native-host/schema-gen/Cargo.toml" ]]; then
    return 1
  fi

  echo "workspace member schema-gen is missing; retrying with a temporary manifest..." >&2

  awk '
    BEGIN { skip = 0 }
    /^\[workspace\][[:space:]]*$/ { skip = 1; next }
    /^\[/ && skip == 1 { skip = 0 }
    skip == 0 { print }
  ' "${MANIFEST_PATH}" > "${TEMP_MANIFEST_PATH}"

  cargo build --release --target "${TARGET}" --manifest-path "${TEMP_MANIFEST_PATH}"
}

echo "Building native-host (release)..."
build_native_host

if [[ ! -f "${SRC_EXE}" ]]; then
  echo "Built executable not found: ${SRC_EXE}" >&2
  exit 1
fi

mkdir -p "${dest_dir}"
cp "${SRC_EXE}" "${dest_exe}"

echo "Copied:"
echo "  ${SRC_EXE}"
echo "  -> ${dest_exe}"
