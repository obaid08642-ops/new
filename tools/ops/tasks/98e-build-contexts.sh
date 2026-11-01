#!/bin/bash
# Disk at 91%: the compose build contexts nabdah-backend and Napd-admin can hold node_modules (about 1.7 GB). READ-ONLY by default, `status:` lines only.
# Reports the size of each node_modules directory under the build contexts, whether a .dockerignore there excludes node_modules (the proof that an image build never needs the directory), and
# the unused volume mongodb_secondary_data (REPORT ONLY: removing a volume is the owner's decision, this task never does it).
#   APPLY=yes  remove ONLY a node_modules directory whose build context has a .dockerignore line excluding node_modules; a context without that line is skipped.
set -u
APPLY=${APPLY:-no}
ROOT=${OPS_ROOT:-/opt/nabdah}
DK="sudo -n docker"
echo "## build-contexts"
say() { echo "status: build-contexts: $*"; }
# The compose build contexts are ../nabdah-backend (backend, worker) and ../Napd-admin/web-admin (admin). nabdah-backend: deploy/docker/Dockerfile.backend COPIES the prebuilt node_modules into the
# image, so that directory is a build INPUT: its .dockerignore must NOT exclude it, and this task therefore never removes it (it is rebuilt by the release pipeline before each backend build, so
# only the owner of that pipeline can say it is safe to delete between releases). Napd-admin/web-admin: Dockerfile.admin-web runs `npm ci` itself, so a host node_modules is never used; its
# .dockerignore (admin/.dockerignore in the repo) excludes it, and then it is removable.
for ctx in nabdah-backend Napd-admin/web-admin Napd-admin; do
  nm="$ROOT/$ctx/node_modules"
  if ! sudo -n test -d "$nm"; then say "$ctx: no node_modules directory"; continue; fi
  size=$(sudo -n du -sm "$nm" 2>/dev/null | cut -f1)
  if sudo -n grep -qE '^/?(\*\*/)?node_modules/?$' "$ROOT/$ctx/.dockerignore" 2>/dev/null; then ign=yes; else ign=no; fi
  say "$ctx: node_modules=${size}MB dockerignore_excludes_it=$ign"
  if [ "$ctx" = nabdah-backend ]; then say "$ctx: kept (Dockerfile.backend COPIES node_modules into the image: it is a build input, never removed here)"; continue; fi
  if [ "$ign" != yes ]; then say "$ctx: kept (no .dockerignore line excluding node_modules, a build may copy it)"; continue; fi
  if [ "$APPLY" = yes ]; then sudo -n rm -rf -- "$nm" && say "$ctx: removed node_modules (${size}MB)"; else say "dry run: would remove $nm (${size}MB) (APPLY=yes to do it)"; fi
done
say "volume mongodb_secondary_data: $($DK volume ls -q 2>/dev/null | grep -E 'mongodb_secondary_data$' | head -1 | sed 's/^$/-/') in use by: $($DK ps -a --filter volume=mongodb_secondary_data --format '{{.Names}}' 2>/dev/null | tr '\n' ' ')(report only, removal needs the owner)"
say "disk: $(df -h / | awk 'NR==2 {print $5" used, "$4" free"}')"
say "done$([ "$APPLY" = yes ] && echo '' || echo ' (read-only / dry run)')"
