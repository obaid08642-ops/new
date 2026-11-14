#!/bin/bash
# R12: freeze what ONE mobile app sends to the API at the commit you release it from.
#   tools/ci/freeze-client-contract.sh patient-app 1.0.0     (run from the repo root, on the release commit, after `npm ci` in backend/)
# Writes contracts/released-clients/<app>-<version>.json: every write call (method, URL, body keys) found in <app>/src or <app>/app. CI then checks the CURRENT backend
# DTOs against every frozen file (tools/ci/legacy-client-contract.sh), so a DTO change that would make a build still in the stores answer HTTP 400 fails the PR.
# Commit the file together with the store release; delete a file only when that version is below the app's min_version (see docs/platform/R12-mobile-compat.md).
set -euo pipefail
APP=${1:?app directory name, e.g. patient-app}
VER=${2:?version, e.g. 1.0.0}
[ -d "$APP" ] || { echo "no directory $APP (run from the repo root)"; exit 2; }
OUT=contracts/released-clients/$APP-$VER.json
TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
node tools/audit/clientbodies.js > "$TMP"
node -e '
const [file, app, ver, out] = process.argv.slice(1);
const all = JSON.parse(require("fs").readFileSync(file, "utf8"));
const mine = all.filter((c) => String(c.at || "").startsWith(app + "/"));
if (!mine.length) { console.error("no client calls found for " + app); process.exit(3); }
require("fs").writeFileSync(out, JSON.stringify(mine, null, 1) + "\n");
console.log(out + ": " + mine.length + " calls (frozen from " + (process.env.GITHUB_SHA || "the working tree") + ")");
' "$TMP" "$APP" "$VER" "$OUT"
