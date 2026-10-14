#!/bin/bash
# Builds the release images for the deploy of main on a GitHub runner, never on the production host
# (3.8 GB RAM with the live stack on it; npm under buildkit crashes in that datacenter, see Dockerfile.backend).
# Usage: build-release.sh <source checkout of main at the pinned SHA> <out dir>
# Out: images.tar.gz (backend + admin-web + patient-web + migrations, tagged with the short SHA), deploy.tgz (the deploy/ dir),
#      SHA, SHA256SUMS. Uses the repo's own Dockerfiles; the backend artifacts (node_modules + dist) are built in a
#      plain node:20-bookworm-slim container, as docs/deploy/DEPLOY_BRIEF_FOR_AGENT.md §3.4 says.
set -euo pipefail
SRC=$(cd "$1" && pwd)
OUT=$2
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)
SHA=$(git -C "$SRC" rev-parse HEAD)
S8=${SHA:0:8}
echo "release: building $SHA"

# backend: artifacts outside docker build, then the copy-only Dockerfile
docker run --rm -v "$SRC/backend:/app" -w /app node:20-bookworm-slim \
  sh -c "npm ci --no-audit --no-fund --legacy-peer-deps && npm run build" > "$OUT/backend-build.log" 2>&1 \
  || { tail -40 "$OUT/backend-build.log"; echo "release: backend build FAILED"; exit 1; }
test -f "$SRC/backend/dist/main.js" || { echo "release: backend dist/main.js missing"; exit 1; }
# migrations image: the backend source with dev dependencies (ts-node), for the dry-runs and, with the owner's OK,
# the applies (docs/deploy/DEPLOY_BRIEF_FOR_AGENT.md §3.5); the production image has neither the scripts nor ts-node
docker build -q -t "nabdah-migrations:$S8" -f - "$SRC/backend" <<'DOCKERFILE'
FROM node:20-bookworm-slim
WORKDIR /app
COPY package.json tsconfig*.json ./
COPY node_modules ./node_modules
COPY scripts ./scripts
COPY src ./src
USER node
DOCKERFILE
docker run --rm -v "$SRC/backend:/app" -w /app node:20-bookworm-slim \
  sh -c "npm prune --omit=dev --legacy-peer-deps" >> "$OUT/backend-build.log" 2>&1 \
  || { tail -40 "$OUT/backend-build.log"; echo "release: backend prune FAILED"; exit 1; }
docker build -q -f "$SRC/deploy/docker/Dockerfile.backend" -t "nabdah-prod-backend:$S8" "$SRC/backend"
docker build -q -f "$SRC/deploy/docker/Dockerfile.admin-web" -t "nabdah-prod-admin-web:$S8" "$SRC/admin"
docker build -q -f "$SRC/deploy/docker/Dockerfile.patient-web" -t "nabdah-patient-web:$S8" "$SRC/patient-web"
for i in nabdah-prod-backend nabdah-prod-admin-web nabdah-patient-web nabdah-migrations; do
  docker image inspect "$i:$S8" -f "release: $i:$S8 {{.Size}} bytes"
done

docker save "nabdah-prod-backend:$S8" "nabdah-prod-admin-web:$S8" "nabdah-patient-web:$S8" "nabdah-migrations:$S8" | gzip -1 > "$OUT/images.tar.gz"
tar -czf "$OUT/deploy.tgz" -C "$SRC" deploy
echo "$SHA" > "$OUT/SHA"
(cd "$OUT" && sha256sum images.tar.gz deploy.tgz SHA > SHA256SUMS)
rm -f "$OUT/backend-build.log"
ls -la "$OUT"
echo "release: done $S8"
