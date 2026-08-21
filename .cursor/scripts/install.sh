#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${ROOT}"

cd SAC_Custom_Widgets/file-upload-widget-master
npm ci
npm run build

cd "${ROOT}"
./.cursor/scripts/package-planning-table.sh

echo "Cloud Agent install complete."
