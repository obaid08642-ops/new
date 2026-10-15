#!/bin/bash
# Finish the rollback of deploy run 38757789693 (reviewer, 2026-10-15). That run failed at "admin-web/patient-web up";
# its rollback restored the files and env and removed worker + meilisearch, but `docker compose up` of the old stack
# failed as a whole (the old patient-web container runs an image that is gone from the host), so the backend stayed
# on the release (ce53c57f) next to the old admin-web / patient-web / nginx. The new backend reads the canonical
# `medicines` collection, which production does not have yet (63: medicines=0), so the public catalogue is empty.
# This puts the backend back on its rollback image, alone (patient-web is not touched: it is on the old code and
# answers 200), then checks the whole old stack. Also prints, read-only, what the next deploy needs to know:
# catalogue collections and their visibility fields (counts only) and the last off-server backup error.
set -u
TS=${OPS_ROLLBACK_TS:-20261015T171847Z}
S8=${OPS_RELEASE_S8:-ce53c57f}
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
ENVF=$D/.env.production
DK="sudo -n docker"
SNAP=$B/deploy-files-pre-$S8-$TS.tgz
COMPOSE_OLD="$DK compose -f $D/docker-compose.production.yml --project-directory $D --env-file $ENVF"
H_API='Host: api.nabd.plus'
mask() { sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/<email>/g; s/\+?[0-9][0-9 ()-]{8,}[0-9]/<number>/g' | grep -viE 'password|secret|token' | cut -c1-300; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
code() { curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H "$1" "https://127.0.0.1$2"; }
echo "## rollback-backend $S8 $TS"
T=$(mktemp -d); trap 'sudo -n rm -rf "$T"' EXIT

# ---------------------------------------------------------------- 0. the files must already be the old ones
sudo -n test -f "$SNAP" || { echo "deploy: ABORT snapshot $SNAP not found"; exit 1; }
sudo -n tar -xzf "$SNAP" -C "$T"
for f in $(sudo -n tar -tzf "$SNAP" | grep -v '/$'); do
  [ "$(sudo -n sha256sum "$T/$f" | cut -c1-64)" = "$(sudo -n sha256sum "$D/$f" 2>/dev/null | cut -c1-64)" ] \
    || { echo "deploy: ABORT $f differs from the pre-deploy snapshot; not guessing which is right"; exit 1; }
done
sudo -n test -e $D/docker-compose.release.yml && { echo "deploy: ABORT docker-compose.release.yml is back; the files are not the old ones"; exit 1; }
echo "deploy: deploy files and env are the pre-deploy ones ($(basename $SNAP))"

# ---------------------------------------------------------------- 1. backend onto its rollback image
RB=$($DK image inspect -f '{{.Id}}' nabdah-backend:rollback-$TS 2>/dev/null)
[ -n "$RB" ] || { echo "deploy: ABORT no image nabdah-backend:rollback-$TS"; exit 1; }
# (the rendered config holds env values: it goes to python only, never to the output)
REF=$($COMPOSE_OLD config --format json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["services"]["backend"].get("image",""))' 2>/dev/null)
[ -n "$REF" ] || { echo "deploy: ABORT cannot read the backend image name from the old compose file"; exit 1; }
[ "$($DK image inspect -f '{{.Id}}' "$REF" 2>/dev/null)" = "$RB" ] || { $DK tag "$RB" "$REF" && echo "deploy: $REF tagged to the rollback image again"; }
if [ "$($DK inspect -f '{{.Image}}' nabdah-backend 2>/dev/null)" = "$RB" ]; then
  echo "deploy: backend already on rollback-$TS"
else
  OUT=$($COMPOSE_OLD up -d --no-build --no-deps --force-recreate backend 2>&1); rc=$?
  printf '%s\n' "$OUT" | mask | tail -8 | sed 's/^/deploy:   compose: /'
  [ $rc = 0 ] || { echo "deploy: FAIL compose up backend exit $rc (the release backend may still be running)"; exit 1; }
  for i in $(seq 1 48); do [ "$(health nabdah-backend)" = healthy ] && break; sleep 5; done
fi
[ "$($DK inspect -f '{{.Image}}' nabdah-backend)" = "$RB" ] && echo "deploy: backend runs rollback-$TS ($REF)" || { echo "deploy: FAIL backend is not on rollback-$TS"; exit 1; }
[ "$(health nabdah-backend)" = healthy ] || { echo "deploy: FAIL backend not healthy"; exit 1; }
for c in nabdah-worker nabdah-meilisearch; do $DK inspect $c >/dev/null 2>&1 && { $DK rm -f $c >/dev/null 2>&1; echo "deploy: $c removed (not in the old stack)"; }; done
# the old nginx.conf resolves container names once: reload so it sends /api to the new backend container
$DK exec nabdah-nginx nginx -t >/dev/null 2>&1 && $DK exec nabdah-nginx nginx -s reload >/dev/null 2>&1 && echo "deploy: nginx -t ok, reloaded" || { echo "deploy: FAIL nginx -t or reload"; exit 1; }

# ---------------------------------------------------------------- 2. the old stack, checked
sleep 3
ok=1
for s in backend admin-web patient-web; do echo "deploy: $s $($DK inspect -f '{{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}} image={{.Config.Image}} started={{.State.StartedAt}}' nabdah-$s 2>&1 | cut -c1-160)"; done
for c in "$H_API|/api/v1/health/liveness" 'Host: nabd.plus|/ar' 'Host: admin.nabd.plus|/login'; do
  h=${c%%|*}; p=${c#*|}; r=$(code "$h" "$p"); echo "deploy: ${h#Host: }$p -> $r"; [ "$r" = 200 ] || ok=0
done
M=$(curl -sk --max-time 20 -H "$H_API" 'https://127.0.0.1/api/v1/medicines?limit=5' | python3 -c '
import json,sys
try: d=json.load(sys.stdin)
except Exception: print("not-json"); sys.exit()
for k in ("data","items","results","medicines"):
    if isinstance(d,dict) and isinstance(d.get(k),list): d=d[k]; break
print(len(d) if isinstance(d,list) else "unknown-shape")')
echo "deploy: GET /api/v1/medicines?limit=5 -> $M item(s)"
if [ "${OPS_REQUIRE_MEDICINES:-1}" = 1 ]; then case "$M" in [1-9]*) ;; *) ok=0; echo "deploy: FAIL the public medicine list is still empty";; esac; fi
[ $ok = 1 ] && echo "deploy: ROLLBACK COMPLETE - backend, admin-web, patient-web, nginx and files are the pre-deploy ones" || { echo "deploy: ROLLBACK CHECKS FAILED"; exit 1; }

# ---------------------------------------------------------------- 3. read-only facts for the next deploy (counts only)
DBN=$(sudo -n grep -E '^DB_NAME=' $ENVF | cut -d= -f2); DBN=${DBN:-nabd_nestjs}
$DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin '"$DBN"' --eval "
const names = db.getCollectionNames().filter(n => /medic|lab|radiolog|nursing|insuranc|specialt|catalog/i.test(n)).sort();
for (const n of names) print(\"x0: collection \" + n + \" \" + db.getCollection(n).estimatedDocumentCount());
for (const n of names.filter(n => /medic/i.test(n))) {
  const c = db.getCollection(n); const k = (q) => c.countDocuments(q);
  const st = c.aggregate([{\$group: {_id: \"\$medical_review_status\", n: {\$sum: 1}}}]).toArray().map(r => (r._id === null ? \"none\" : r._id) + \"=\" + r.n).join(\",\");
  print(\"x0: \" + n + \": total=\" + k({}) + \" deleted=\" + k({is_deleted: true}) + \" public_eligibility_true=\" + k({public_eligibility: true}) + \" review_status[\" + st + \"] approved_and_public=\" + k({public_eligibility: true, medical_review_status: \"approved\", is_deleted: {\$ne: true}}) + \" requires_prescription=\" + k({requires_prescription: true}) + \" controlled=\" + k({controlled: true}) + \" active_false=\" + k({active: false}));
}
const r = db.getCollection(\"backup_runs\").find({kind: \"offsite\"}).sort({reported_at: -1}).limit(1).toArray()[0];
print(\"x0: last offsite backup report: \" + (r ? (r.ok + \" \" + String(r.error || \"\").replace(/\\s+/g, \" \").slice(0, 400)) : \"none\"));
"' 2>&1 | grep '^x0:' | mask
echo "## rollback-backend done"
