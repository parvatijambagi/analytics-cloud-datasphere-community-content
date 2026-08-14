#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PKG_DIR="${ROOT}/SAC_Custom_Widgets/planning-table-package"
PORT=8080
PID_FILE="/tmp/planning-table-server.pid"
LOG_FILE="/tmp/planning-table-server.log"

is_ready() {
  curl -sf "http://127.0.0.1:${PORT}/main.js" >/dev/null 2>&1
}

if is_ready; then
  echo "Planning table static server already running on port ${PORT}"
  exit 0
fi

if [[ -f "${PID_FILE}" ]]; then
  old_pid="$(cat "${PID_FILE}")"
  if kill -0 "${old_pid}" 2>/dev/null; then
    kill "${old_pid}" || true
  fi
  rm -f "${PID_FILE}"
fi

nohup python3 -m http.server "${PORT}" --directory "${PKG_DIR}" >"${LOG_FILE}" 2>&1 &
echo $! >"${PID_FILE}"

for _ in $(seq 1 30); do
  if is_ready; then
    echo "Planning table static server ready on http://127.0.0.1:${PORT}"
    exit 0
  fi
  sleep 0.5
done

echo "Planning table server failed to start" >&2
cat "${LOG_FILE}" >&2
exit 1
