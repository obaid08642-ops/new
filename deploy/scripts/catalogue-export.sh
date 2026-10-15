#!/bin/bash
# ═══ Weekly medicine catalogue export (D-33, owner decision 33) ═══
# The medicines collection as a JSON array plus the list of every image URL it references (image, images[], image_N),
# uploaded to the PRIVATE backup bucket under catalogue/<date>/, apart from the nightly dump, so the catalogue can be
# rebuilt on its own. Reported to the admin page as catalogue_export. Schedule: deploy/cron/nabd-backups.
set -uo pipefail
source "$(dirname "$0")/_backup-common.sh"
nabd_load_env

fail() { echo "[$(date)] FAIL catalogue export: $1"; report catalogue_export false "" "$1"; rm -rf "$TMP"; exit 1; }
TMP=$(mktemp -d)
D=$(date +%Y%m%d)
JSON="$TMP/medicines_$D.json"
LIST="$TMP/medicine_images_$D.txt"

ERR=$(private_bucket_error)
[ -z "$ERR" ] || fail "$ERR"

docker exec "$MONGO_CONTAINER" mongoexport --quiet \
  -u "${MONGO_ROOT_USER:-}" -p "${MONGO_ROOT_PASSWORD:-}" --authenticationDatabase admin \
  --db="$DB_NAME" --collection=medicines --jsonArray > "$JSON" && [ -s "$JSON" ] || fail "mongoexport failed or wrote nothing"

python3 -I - "$JSON" "$LIST" <<'PY' || fail "the export is not valid JSON"
import json, re, sys
docs = json.load(open(sys.argv[1], encoding="utf-8"))
urls = []
for d in docs:
    for k, v in d.items():
        if k == "image" or k == "images" or re.fullmatch(r"image_\d+", k):
            for u in (v if isinstance(v, list) else [v]):
                if isinstance(u, str) and u.strip() and u not in urls:
                    urls.append(u.strip())
open(sys.argv[2], "w", encoding="utf-8").write("".join(u + "\n" for u in urls))
print(f"{len(docs)} medicines, {len(urls)} image URLs")
PY

for f in "$JSON" "$LIST"; do
  OUT=$(backup_aws s3 cp "$f" "s3://$BACKUP_S3_BUCKET/catalogue/$D/$(basename "$f")" --only-show-errors 2>&1) \
    || fail "upload failed: $(printf '%s' "$OUT" | tail -3)"
done
SIZE=$(( $(stat -c %s "$JSON") + $(stat -c %s "$LIST") ))
echo "[$(date)] catalogue export: s3://$BACKUP_S3_BUCKET/catalogue/$D/ ($SIZE bytes)"
report catalogue_export true "$SIZE"
rm -rf "$TMP"
