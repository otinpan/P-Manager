#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MANIFEST_PATH="${REPO_ROOT}/native-host/Cargo.toml"
TEMP_MANIFEST_PATH="${REPO_ROOT}/native-host/Cargo.build.tmp.toml"
HOST_MANIFEST_JSON="${REPO_ROOT}/p_manager_host_chrome.json"
TARGET="x86_64-pc-windows-gnu"
SRC_EXE="${REPO_ROOT}/native-host/target/${TARGET}/release/native-host.exe"

if [[ ! -f "${HOST_MANIFEST_JSON}" ]]; then
  echo "Host manifest not found: ${HOST_MANIFEST_JSON}" >&2
  exit 1
fi

win_path_raw="$(sed -n 's/.*"path"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' "${HOST_MANIFEST_JSON}" | head -n 1)"
if [[ -z "${win_path_raw}" ]]; then
  echo "Failed to read \"path\" from ${HOST_MANIFEST_JSON}" >&2
  exit 1
fi

# JSON escaped backslashes (\\) -> Windows path backslashes (\)
win_path="${win_path_raw//\\\\/\\}"

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
