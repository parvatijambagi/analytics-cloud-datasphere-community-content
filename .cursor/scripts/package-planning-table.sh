#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PKG_DIR="${ROOT}/SAC_Custom_Widgets/planning-table-package"

cd "${PKG_DIR}"
rm -f PlanningTable.zip
zip -q PlanningTable.zip main.js builder.js styling.js

python3 - "${PKG_DIR}" <<'PY'
import base64
import hashlib
import json
import sys

pkg_dir = sys.argv[1]
config_path = f"{pkg_dir}/PlanningTable.json"

with open(config_path, encoding="utf-8") as handle:
    config = json.load(handle)

for component in config["webcomponents"]:
    file_name = component["url"].lstrip("/")
    with open(f"{pkg_dir}/{file_name}", "rb") as handle:
        digest = base64.b64encode(hashlib.sha256(handle.read()).digest()).decode()
    component["integrity"] = f"sha256-{digest}"

with open(config_path, "w", encoding="utf-8") as handle:
    json.dump(config, handle, indent=2)
    handle.write("\n")
PY

cp "${PKG_DIR}/PlanningTable.json" "${ROOT}/PlanningTable.json"
cp "${PKG_DIR}/PlanningTable.zip" "${ROOT}/PlanningTable-resources.zip"

STYLED_PANEL_DIR="${ROOT}/SAC_Custom_Widgets/Planning Table with Styling Panel"
if [[ -d "${STYLED_PANEL_DIR}" ]]; then
  cp "${PKG_DIR}/PlanningTable.zip" "${STYLED_PANEL_DIR}/PlanningTable.zip"
fi

rm -f "${ROOT}/PlanningTable-download.zip"
(
  cd "${ROOT}"
  zip -qj PlanningTable-download.zip PlanningTable.json PlanningTable-resources.zip
)

echo "Planning table package ready:"
unzip -l "${PKG_DIR}/PlanningTable.zip"
