#!/bin/bash
# ops-detach: runs detached on the server (see server-inspect.yml); the workflow polls its log.
# D-33 off-server backups, server side (reviewer, 2026-10-15). Run BEFORE 60-deploy-main so the new backend starts
# with BACKUP_REPORT_TOKEN; 62-backups-verify runs after it. Idempotent.
#   1. the D-33 scripts from main, taken from the release's deploy.tgz (checksums verified): _backup-common.sh,
#      backup.sh, catalogue-export.sh, restore-drill.sh, backup-bucket-lifecycle.sh, monitor.sh, cron/nabd-backups
#   2. aws CLI (pinned awscli in a venv at /opt/nabdah/awscli, linked to /usr/local/bin/aws) when none is installed
#   3. .env.production (copy saved first, mode 600): BACKUP_S3_* from the key file the r2 step left in $HOME (then
#      shredded), BACKUP_REPORT_TOKEN (48 random characters made here, only if missing), BACKUP_REPORT_URL,
#      OPS_ALERT_EMAIL; refuses a backup bucket or key equal to the public S3_BUCKET / S3_ACCESS_KEY_ID
#   4. scripts installed in deploy/scripts (old ones saved), /etc/cron.d/nabd-backups installed (with PATH), the old
#      crontab lines for backup.sh / restore-drill.sh removed, monitor.sh kept on its 15-minute schedule
# The 30-day expiry is set on the bucket by the r2 step (Cloudflare API with the Global API Key): the server's key can
# only read and write objects in the bucket, not change its settings. Values are never printed, names only.
set -u
SHA=${OPS_RELEASE_SHA:-0579c8ccc1a690e0dd498871b8b9fce8a0d5fcdf}
S8=${SHA:0:8}
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
REL=${OPS_RELEASE_DIR:-/opt/nabdah/releases}/$S8
ENVF=$D/.env.production
CREDS=${OPS_R2_CREDS:-$HOME/ops-r2-backup.env}
ALERT_EMAIL=obaid08642@gmail.com            # the owner's, given by the reviewer 2026-10-15 (already public as the commit author)
REPORT_URL=${OPS_BACKUP_REPORT_URL:-https://api.nabd.plus}
AWSCLI_VERSION=1.45.62
TS=$(date -u +%Y%m%dT%H%M%SZ)
FILES="scripts/_backup-common.sh scripts/backup.sh scripts/catalogue-export.sh scripts/restore-drill.sh scripts/backup-bucket-lifecycle.sh scripts/monitor.sh cron/nabd-backups"
echo "## backups-env $S8"
# the key file never outlives this task, whatever happens (the r2 step makes a new key when the server has none)
T=$(mktemp -d); trap 'rm -rf "$T"; rm -f "$T.env"; [ -f "$CREDS" ] && { shred -u "$CREDS" 2>/dev/null || rm -f "$CREDS"; }' EXIT

# ---------------------------------------------------------------- 1. scripts from the release
[ -f "$REL/SHA256SUMS" ] && (cd "$REL" && sha256sum -c --quiet SHA256SUMS) || { echo "backups: ABORT release $S8 missing or checksum mismatch"; exit 1; }
tar -xzf "$REL/deploy.tgz" -C "$T" $(for f in $FILES; do echo "deploy/$f"; done) 2>/dev/null \
  || { echo "backups: ABORT the release $S8 does not carry the D-33 scripts"; exit 1; }
for f in $FILES; do case $f in *.sh) bash -n "$T/deploy/$f" || { echo "backups: ABORT $f does not parse"; exit 1; } ;; esac; done
echo "backups: D-33 scripts taken from release $S8"

# ---------------------------------------------------------------- 2. aws CLI
if command -v aws >/dev/null 2>&1; then
  echo "backups: aws CLI present ($(aws --version 2>&1 | cut -d' ' -f1))"
else
  python3 -c 'import ensurepip, venv' 2>/dev/null || sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-venv >/dev/null 2>&1
  sudo -n python3 -m venv /opt/nabdah/awscli \
    && sudo -n /opt/nabdah/awscli/bin/pip install -q --disable-pip-version-check "awscli==$AWSCLI_VERSION" >/dev/null 2>&1 \
    && sudo -n ln -sf /opt/nabdah/awscli/bin/aws /usr/local/bin/aws \
    || { echo "backups: ABORT aws CLI install failed"; exit 1; }
  echo "backups: aws CLI installed ($(/usr/local/bin/aws --version 2>&1 | cut -d' ' -f1))"
fi

# ---------------------------------------------------------------- 3. .env.production
sudo -n test -f "$ENVF" || { echo "backups: ABORT $ENVF missing"; exit 1; }
SAVE=$B/env-pre-backups-$TS
sudo -n mkdir -p "$B" && sudo -n cp -p "$ENVF" "$SAVE" && sudo -n chmod 600 "$SAVE" || { echo "backups: ABORT cannot save $ENVF"; exit 1; }
# the key lines go to python on a root-only file, never on a command line
: > "$T.env"; chmod 600 "$T.env"
if [ -f "$CREDS" ]; then
  grep -E '^BACKUP_S3_(ENDPOINT|BUCKET|ACCESS_KEY_ID|SECRET_ACCESS_KEY)=.+$' "$CREDS" > "$T.env"
  [ "$(grep -c . "$T.env")" = 4 ] || { echo "backups: ABORT the key file from the r2 step is incomplete"; exit 1; }
  echo "backups: key file from the r2 step found"
fi
printf 'BACKUP_REPORT_URL=%s\nOPS_ALERT_EMAIL=%s\n' "$REPORT_URL" "$ALERT_EMAIL" >> "$T.env"
OUT=$(sudo -n python3 - "$ENVF" "$T.env" <<'PY'
import os, re, secrets, string, sys
envf, newf = sys.argv[1], sys.argv[2]
lines = open(envf, encoding="utf-8").read().splitlines()
def get(name):
    for l in lines:
        if l.startswith(name + "="):
            return l.split("=", 1)[1].strip().strip('"').strip("'")
    return ""
new = dict(l.split("=", 1) for l in open(newf, encoding="utf-8").read().splitlines() if "=" in l)
# BACKUP_REPORT_URL keeps an existing value; the rest is set as given
if get("BACKUP_REPORT_URL"):
    new.pop("BACKUP_REPORT_URL", None)
if not get("BACKUP_REPORT_TOKEN") or len(get("BACKUP_REPORT_TOKEN")) < 32:
    new["BACKUP_REPORT_TOKEN"] = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(48))
# a client that checksums every request (newer botocore) is limited to what the S3 API needs
for k in ("AWS_REQUEST_CHECKSUM_CALCULATION", "AWS_RESPONSE_CHECKSUM_VALIDATION"):
    if not get(k):
        new[k] = "WHEN_REQUIRED"
bucket = new.get("BACKUP_S3_BUCKET") or get("BACKUP_S3_BUCKET")
key = new.get("BACKUP_S3_ACCESS_KEY_ID") or get("BACKUP_S3_ACCESS_KEY_ID")
if not bucket or not key:
    print("ABORT no backup bucket key: neither the r2 step's file nor .env.production has BACKUP_S3_*"); sys.exit(2)
if bucket == get("S3_BUCKET") or key == get("S3_ACCESS_KEY_ID"):
    print("ABORT the backup bucket or key is the public CDN one (S3_BUCKET)"); sys.exit(2)
changed = []
for k, v in new.items():
    if get(k) == v:
        continue
    lines = [l for l in lines if not l.startswith(k + "=")]
    lines.append(f"{k}={v}")
    changed.append(k)
tmp = envf + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
os.chmod(tmp, 0o600)
os.replace(tmp, envf)
print("names set: " + (" ".join(changed) if changed else "none"))
PY
)
rc=$?
echo "backups: env $OUT"
[ $rc = 0 ] || { sudo -n cp -p "$SAVE" "$ENVF"; echo "backups: ABORT env unchanged (copy put back)"; exit 1; }
[ -f "$CREDS" ] && { shred -u "$CREDS" 2>/dev/null || rm -f "$CREDS"; echo "backups: key file from the r2 step removed"; }

# ---------------------------------------------------------------- 4. scripts, cron, monitor
OLD=$B/scripts-pre-backups-$TS.tgz
sudo -n tar -czf "$OLD" -C "$D" --ignore-failed-read scripts 2>/dev/null
sudo -n install -d -m 755 "$D/scripts"
for f in $FILES; do
  case $f in scripts/*) sudo -n install -m 755 -o root -g root "$T/deploy/$f" "$D/$f" || { echo "backups: ABORT cannot install $f"; exit 1; } ;; esac
done
sudo -n install -d -m 755 "$D/cron"
sudo -n install -m 644 -o root -g root "$T/deploy/cron/nabd-backups" "$D/cron/nabd-backups"
# cron.d starts jobs with PATH=/usr/bin:/bin; aws is in /usr/local/bin
{ grep -q '^PATH=' "$T/deploy/cron/nabd-backups" || echo 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'; cat "$T/deploy/cron/nabd-backups"; } > "$T/nabd-backups"
sudo -n install -m 644 -o root -g root "$T/nabd-backups" /etc/cron.d/nabd-backups
echo "backups: scripts installed in $D/scripts (old ones in $(basename $OLD)), /etc/cron.d/nabd-backups installed"
for who in root "$(id -un)"; do
  if [ "$who" = root ]; then CT="sudo -n crontab"; else CT="crontab"; fi
  cur=$($CT -l 2>/dev/null) || continue
  n=$(printf '%s\n' "$cur" | grep -cE 'scripts/(backup|restore-drill)\.sh')
  if [ "$n" -gt 0 ]; then
    printf '%s\n' "$cur" | grep -vE 'scripts/(backup|restore-drill)\.sh' | $CT - && echo "backups: $n old crontab line(s) of $who for backup.sh/restore-drill.sh removed"
  fi
done
if { sudo -n crontab -l 2>/dev/null; crontab -l 2>/dev/null; sudo -n cat /etc/cron.d/* 2>/dev/null; } | grep -v '^\s*#' | grep -q 'scripts/monitor.sh'; then
  echo "backups: monitor.sh already scheduled; the new version runs from the next quarter hour"
else
  echo '*/15 * * * * root /opt/nabdah/deploy/scripts/monitor.sh >/dev/null 2>&1' > "$T/nabd-monitor"
  sudo -n install -m 644 -o root -g root "$T/nabd-monitor" /etc/cron.d/nabd-monitor && echo "backups: monitor.sh scheduled every 15 minutes (/etc/cron.d/nabd-monitor)"
fi
echo "backups: env done (names only above); run 60-deploy-main next so the backend reads BACKUP_REPORT_TOKEN"
echo "## backups-env done"
