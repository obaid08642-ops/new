#!/bin/bash
# Mail providers in the production env (owner, 2026-10-16). Idempotent. Values are never printed, names only.
#   1. .env.production (copy saved first, mode 600):
#      - BREVO_API_KEY, MAILJET_API_KEY, MAILJET_SECRET_KEY from the key file the workflow left in $HOME (GitHub
#        secrets, delivered on ssh stdin; shredded here whatever happens). RESEND_API_KEY is already on the server.
#      - Brevo sends over its REST API with BREVO_API_KEY (PR #1583); MAILJET_FROM/BREVO_FROM unset = MAIL_FROM
#      - MAIL_PROVIDER_ORDER=resend,brevo,mailjet (no Amazon SES, MailerSend or Cloudflare Email)
#      - quotas = each free plan: Resend 100/day 3000/month, Brevo 300/day, Mailjet 200/day 6000/month
#        (read by backend/src/modules/mail/mail.module.ts, PR #1583, as <PROVIDER>_DAILY_QUOTA/_MONTHLY_QUOTA)
#   2. Resend: the domain nabd.plus as Resend sees it (status and each record's type, name and status; never values),
#      with the server's own RESEND_API_KEY, which never leaves the server.
# The backend reads the new names when its container is next created (the deploy of the mail PR); nothing restarts here.
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
ENVF=$D/.env.production
CREDS=${OPS_MAIL_CREDS:-$HOME/ops-mail.env}
RESEND_API=${OPS_RESEND_API:-https://api.resend.com}
DOMAIN=nabd.plus
TS=$(date -u +%Y%m%dT%H%M%SZ)
T=$(mktemp); chmod 600 "$T"
trap 'rm -f "$T"; [ -f "$CREDS" ] && { shred -u "$CREDS" 2>/dev/null || rm -f "$CREDS"; }' EXIT
echo "## mail-env"

# ---------------------------------------------------------------- 1. env
sudo -n test -f "$ENVF" || { echo "mail: ABORT $ENVF missing"; exit 1; }
if [ -f "$CREDS" ]; then
  grep -E '^(BREVO_API_KEY|MAILJET_API_KEY|MAILJET_SECRET_KEY)=.+$' "$CREDS" > "$T"
  echo "mail: key file found with $(grep -c . "$T") of 3 keys"
else
  echo "mail: no key file (keys already on the server are kept)"
fi
cat >> "$T" <<'EOF'
MAIL_PROVIDER_ORDER=resend,brevo,mailjet
RESEND_DAILY_QUOTA=100
RESEND_MONTHLY_QUOTA=3000
BREVO_DAILY_QUOTA=300
MAILJET_DAILY_QUOTA=200
MAILJET_MONTHLY_QUOTA=6000
EOF
# a unique name: two runs in the same second must not share (and then remove) one copy
sudo -n mkdir -p "$B" && SAVE=$(sudo -n mktemp "$B/env-pre-mail-$TS-XXXX") && sudo -n cp -p "$ENVF" "$SAVE" && sudo -n chmod 600 "$SAVE" \
  || { echo "mail: ABORT cannot save $ENVF"; exit 1; }
OUT=$(sudo -n python3 - "$ENVF" "$T" <<'PY'
import os, sys
envf, newf = sys.argv[1], sys.argv[2]
lines = open(envf, encoding="utf-8").read().splitlines()
def get(name):
    for l in lines:
        if l.startswith(name + "="):
            return l.split("=", 1)[1].strip().strip('"').strip("'")
    return None
new = dict(l.split("=", 1) for l in open(newf, encoding="utf-8").read().splitlines() if "=" in l)
changed = []
for k, v in new.items():
    if get(k) == v:
        continue
    lines = [l for l in lines if not l.startswith(k + "=")]
    lines.append(f"{k}={v}")
    changed.append(k)
present = [k for k in ("RESEND_API_KEY", "BREVO_API_KEY", "MAILJET_API_KEY", "MAILJET_SECRET_KEY") if get(k) or new.get(k)]
missing = [k for k in ("RESEND_API_KEY", "BREVO_API_KEY", "MAILJET_API_KEY", "MAILJET_SECRET_KEY") if k not in present]
ses = [k for k in ("SES_SMTP_HOST", "SES_SMTP_USER", "SES_SMTP_PASS") if get(k)]
tmp = envf + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
os.chmod(tmp, 0o600)
os.replace(tmp, envf)
print("names set: " + (" ".join(changed) if changed else "none"))
print("keys present: " + " ".join(present) + ("; MISSING: " + " ".join(missing) if missing else ""))
if ses:
    print("note: SES names still in the env (" + " ".join(ses) + "); unused, MAIL_PROVIDER_ORDER leaves SES out")
PY
)
rc=$?
echo "$OUT" | sed 's/^/mail: env /'
[ $rc = 0 ] || { sudo -n cp -p "$SAVE" "$ENVF"; echo "mail: ABORT env unchanged (copy put back)"; exit 1; }
sudo -n cmp -s "$SAVE" "$ENVF" && { sudo -n rm -f "$SAVE"; echo "mail: env already as wanted (no copy kept)"; } || echo "mail: env copy before the change: $(basename "$SAVE")"

# ---------------------------------------------------------------- 2. Resend's view of the domain
# the key goes to curl on stdin (--config -), never on a command line
resend() {
  sudo -n grep -m1 '^RESEND_API_KEY=' "$ENVF" | cut -d= -f2- | tr -d '"'"'" \
    | { read -r K; printf 'header = "Authorization: Bearer %s"\n' "$K" | curl -s --max-time 20 --config - "$@"; }
}
ID=$(resend "$RESEND_API/domains" | jq -r --arg d "$DOMAIN" '.data[]? | select(.name == $d) | .id' | head -1)
if [ -z "$ID" ]; then
  echo "mail: resend: domain $DOMAIN not found in the Resend account (or the key cannot list domains)"
else
  R=$(resend "$RESEND_API/domains/$ID")
  if [ "$(echo "$R" | jq -r .status)" != verified ]; then
    resend -X POST "$RESEND_API/domains/$ID/verify" >/dev/null
    echo "mail: resend: verification asked again"
    R=$(resend "$RESEND_API/domains/$ID")
  fi
  echo "mail: resend: domain $DOMAIN status=$(echo "$R" | jq -r .status) region=$(echo "$R" | jq -r '.region // "-"')"
  echo "$R" | jq -r '.records[]? | "mail: resend:   \(.record) \(.type) \(.name) status=\(.status)"'
fi
echo "## mail-env done"
