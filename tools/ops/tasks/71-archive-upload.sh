#!/bin/bash
# ops-detach: runs detached on the server (see server-inspect.yml); the workflow polls its log.
# Owner, 2026-10-16: the four old folders /opt/nabdah/{nabdah-backend,patient-web,Napd-admin,import} (2.7 GB, mounted by no
# container) and the unused docker volume mongodb_secondary_data (910 MB) are uploaded ONCE to the private R2 backup bucket,
# verified, and only then (task 72, a SEPARATE approved run) removed.
#
# This task changes nothing on the server's disk: it only reads and uploads.
#   1. refuses to start unless the private backup bucket is usable and nothing mounts a folder / the volume
#   2. each item is streamed (tar | gzip) to s3://<backup bucket>/archive/<date>/<name>.tar.gz; the sha256 and byte count of
#      the stream are taken while it is sent
#   3. verified: the object's size equals the bytes sent, and the object read back from the bucket hashes to the same sha256
#   4. MANIFEST.tsv (key, bytes, sha256, source, source bytes) is uploaded last; task 72 trusts only what it lists
# The bucket expired every object after 30 days until tools/ops/cf/42-r2-archive-prefix.sh scoped that to mongodb/ and
# catalogue/ (RUN lists it in the same run, after this task: run 72 only after the cf line says archive/ is kept).
# Prints names, sizes, hashes (first 16 hex) and counts only. Idempotent: an item already in the bucket with the same
# size is verified again, not uploaded twice. Public lines start with "cleanup:".
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ROOT=${OPS_ROOT:-/opt/nabdah}
DATE=${OPS_ARCHIVE_DATE:-2026-10-16}
FOLDERS=${OPS_ARCHIVE_FOLDERS:-"nabdah-backend patient-web Napd-admin import"}
VOLUME_RE=${OPS_ARCHIVE_VOLUME_RE:-'(^|_)mongodb_secondary_data$'}
TAR_IMAGE=${OPS_TAR_IMAGE:-mongo:7.0}
if [ "$(id -u)" != 0 ]; then exec sudo -n -E env "PATH=$PATH" bash "$0" "$@"; fi
DK=docker
P() { echo "cleanup: archive: $*"; }
# the mount checks below read the container list: no answer from docker must stop the run, not look like "nothing mounts it"
# (OPS_SKIP_DOCKER_CHECK=1 is for tests on a machine without a Docker daemon only)
[ "${OPS_SKIP_DOCKER_CHECK:-0}" = 1 ] || $DK ps -aq >/dev/null 2>&1 || { P "ABORT docker does not answer; mounts cannot be checked"; exit 1; }
. "$D/scripts/_backup-common.sh"; NABD_ENV_FILE=$D/.env.production nabd_load_env
ERR=$(private_bucket_error); [ -z "$ERR" ] || { P "ABORT $ERR"; exit 1; }
PREFIX="archive/$DATE"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
set -o pipefail
mb() { awk -v b="${1:-0}" 'BEGIN{printf "%.0f MB", b/1048576}'; }
P "start: / free $(df -Pk / | awk 'NR==2{printf "%.1f", $4/1048576}') GB; bucket $BACKUP_S3_BUCKET, prefix $PREFIX/"

# who mounts what (containers, running or not)
mounts() { $DK ps -aq | xargs -r $DK inspect -f '{{.Name}} {{range .Mounts}}{{.Source}} {{.Name}} {{end}}'; }
head_size() { backup_aws s3api head-object --bucket "$BACKUP_S3_BUCKET" --key "$1" --query ContentLength --output text 2>/dev/null; }

: > "$T/manifest"
FAILED=0
# stream_item <label> <key> <source description> <source bytes> <command producing the tar.gz stream…>
stream_item() {
  local label=$1 key=$2 src=$3 srcbytes=$4; shift 4
  local rm_sha=$T/$label.sha rm_bytes=$T/$label.bytes
  rm -f "$rm_sha" "$rm_bytes"
  "$@" 2>"$T/$label.err" | tee >(sha256sum | cut -d' ' -f1 > "$rm_sha") >(wc -c > "$rm_bytes") \
    | backup_aws s3 cp - "s3://$BACKUP_S3_BUCKET/$key" --only-show-errors --expected-size 4000000000 2>"$T/$label.up"
  local rc=$?
  for i in $(seq 1 60); do [ -s "$rm_sha" ] && [ -s "$rm_bytes" ] && break; sleep 1; done
  local sha bytes; sha=$(cat "$rm_sha" 2>/dev/null); bytes=$(tr -d ' ' < "$rm_bytes" 2>/dev/null)
  if [ $rc != 0 ] || [ -z "$sha" ] || [ -z "$bytes" ] || [ "$bytes" = 0 ]; then
    P "$label: FAIL upload (exit $rc): $(head -c 200 "$T/$label.err" "$T/$label.up" | tr '\n' ' ')"; FAILED=1; return 1
  fi
  local remote; remote=$(head_size "$key")
  [ "$remote" = "$bytes" ] || { P "$label: FAIL the object is $remote bytes, the stream was $bytes"; FAILED=1; return 1; }
  local back; back=$(backup_aws s3 cp "s3://$BACKUP_S3_BUCKET/$key" - --only-show-errors 2>/dev/null | sha256sum | cut -d' ' -f1)
  [ "$back" = "$sha" ] || { P "$label: FAIL read back from the bucket hashes to ${back:0:16}…, the stream to ${sha:0:16}…"; FAILED=1; return 1; }
  P "$label: uploaded and read back: $key, $(mb "$bytes") (source $(mb "$srcbytes")), sha256 ${sha:0:16}…"
  printf '%s\t%s\t%s\t%s\t%s\n' "$key" "$bytes" "$sha" "$src" "$srcbytes" >> "$T/manifest"
}

# ---------------------------------------------------------------- the folders
for name in $FOLDERS; do
  case "$name" in ""|*/*|.*) P "$name: refused (not a plain folder name)"; FAILED=1; continue ;; esac
  dir="$ROOT/$name"
  if [ ! -d "$dir" ] || [ -L "$dir" ]; then P "$name: not a plain directory here ($dir), skipped"; continue; fi
  if mounts | grep -qF " $dir"; then P "$name: ABORT a container mounts $dir"; FAILED=1; continue; fi
  if mounts | grep -qF "$dir/"; then P "$name: ABORT a container mounts something inside $dir"; FAILED=1; continue; fi
  srcbytes=$(du -sb "$dir" 2>/dev/null | cut -f1)
  stream_item "$name" "$PREFIX/$name.tar.gz" "$dir" "$srcbytes" tar -C "$ROOT" -czf - "$name"
done

# ---------------------------------------------------------------- the unused volume
VOL=$($DK volume ls -q 2>/dev/null | grep -E "$VOLUME_RE" | head -1)
if [ -z "$VOL" ]; then
  P "volume: no docker volume matches mongodb_secondary_data, skipped"
else
  USERS=$($DK ps -aq --filter "volume=$VOL" | wc -l)
  if [ "$USERS" != 0 ]; then P "volume $VOL: ABORT $USERS container(s) use it"; FAILED=1
  else
    mp=$($DK volume inspect -f '{{.Mountpoint}}' "$VOL"); srcbytes=$(du -sb "$mp" 2>/dev/null | cut -f1)
    stream_item volume "$PREFIX/volume-$VOL.tar.gz" "docker volume $VOL" "$srcbytes" \
      $DK run --rm --network none --entrypoint tar -v "$VOL":/v:ro "$TAR_IMAGE" -czf - -C /v .
  fi
fi

# ---------------------------------------------------------------- the manifest, last (merged with an earlier run's lines for
# items that are no longer on the server, so the record of what was archived never shrinks)
if [ -s "$T/manifest" ]; then
  if backup_aws s3 cp "s3://$BACKUP_S3_BUCKET/$PREFIX/MANIFEST.tsv" "$T/manifest.old" --only-show-errors 2>/dev/null && [ -s "$T/manifest.old" ]; then
    awk -F'\t' 'NR==FNR {new[$1]=1; next} !($1 in new)' "$T/manifest" "$T/manifest.old" > "$T/manifest.keep"
    cat "$T/manifest.keep" "$T/manifest" > "$T/manifest.merged"; mv "$T/manifest.merged" "$T/manifest"
  fi
  backup_aws s3 cp "$T/manifest" "s3://$BACKUP_S3_BUCKET/$PREFIX/MANIFEST.tsv" --only-show-errors \
    && P "manifest: $PREFIX/MANIFEST.tsv lists $(wc -l < "$T/manifest") object(s), $(mb "$(awk -F'\t' '{s+=$2} END{print s+0}' "$T/manifest")") in the bucket" \
    || { P "FAIL manifest upload"; FAILED=1; }
else
  P "nothing was uploaded"; FAILED=1
fi
P "bucket now: $(backup_aws s3 ls "s3://$BACKUP_S3_BUCKET/archive/" --recursive --human-readable --summarize 2>/dev/null | tail -2 | tr '\n' ' ')"
[ $FAILED = 0 ] && { P "OK: everything is in the bucket and read back; nothing was removed here. Next: confirm the cf line 'archive/ is NOT covered', then run task 72."; exit 0; }
P "NOT OK: see the lines above; nothing was removed"; exit 1
