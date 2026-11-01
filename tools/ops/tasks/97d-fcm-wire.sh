#!/bin/bash
# Puts the three fields of a Firebase service-account JSON that already lies on the server into the env file the backend reads (FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY; the second project
# as *_2), because the backend reads those environment values and not a file path (modules/push/push.module.ts fcmProjects). Dry run by default; names and paths only, NEVER a value.
#   FCM_PRIMARY_FILE=<path>   the service-account JSON for FCM_*   (default: the only one found; with 0 or 2+ found it must be given)
#   FCM_SECONDARY_FILE=<path> optional, for FCM_*_2 (the second Firebase project)
#   APPLY=yes                 write the missing names into the env file (backup first, mode 600). An FCM_* name that already has a value is never overwritten.
# The containers read the env file when they are (re)created, so the values take effect at the next deploy or `docker compose up -d backend worker`; this task does not restart anything.
set -u
APPLY=${APPLY:-no}
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=${OPS_ENV_FILE:-$D/.env.production}
ROOTS=${OPS_FIREBASE_ROOTS:-"/opt/nabdah /root /home /etc/nabdah /srv"}
echo "## fcm-wire"
say() { echo "status: fcm-wire: $*"; }
sudo -n test -f "$ENVF" || { say "ABORT env file $ENVF not found"; exit 1; }
is_sa() { sudo -n grep -q '"type"[[:space:]]*:[[:space:]]*"service_account"' "$1" 2>/dev/null && for k in project_id client_email private_key; do sudo -n grep -q "\"$k\"" "$1" 2>/dev/null || return 1; done; }
FOUND=""
for r in $ROOTS; do
  sudo -n test -d "$r" || continue
  for f in $(sudo -n find "$r" -maxdepth 5 \( -name node_modules -o -name .git -o -name .next -o -name backups -o -name releases \) -prune -o -type f -name '*.json' -size -16k -print 2>/dev/null); do
    is_sa "$f" && FOUND="$FOUND $f"
  done
done
say "service-account JSON files found:${FOUND:- none}"
PRIMARY=${FCM_PRIMARY_FILE:-}
if [ -z "$PRIMARY" ]; then
  set -- $FOUND
  if [ "$#" -eq 1 ]; then PRIMARY=$1; elif [ "$#" -eq 0 ]; then say "ABORT no service-account JSON on the server: nothing to wire (the owner puts the file there, or sets FCM_* by hand)"; exit 1
  else say "ABORT $# service-account files found: set FCM_PRIMARY_FILE (and FCM_SECONDARY_FILE) to say which is which"; exit 1; fi
fi
is_sa "$PRIMARY" || { say "ABORT $PRIMARY is not a service-account JSON with project_id, client_email and private_key"; exit 1; }
has_val() { sudo -n grep -qE "^$1=.+" "$ENVF" 2>/dev/null; }
LINES=$(mktemp); chmod 600 "$LINES"; trap 'rm -f "$LINES"' EXIT
add() { # add <suffix> <file>
  local sfx=$1 file=$2 n
  for n in PROJECT_ID CLIENT_EMAIL PRIVATE_KEY; do
    if has_val "FCM_${n}${sfx}"; then say "FCM_${n}${sfx}: already set in $ENVF: kept"; continue; fi
    case $n in
      PROJECT_ID) v=$(sudo -n jq -r .project_id "$file");;
      CLIENT_EMAIL) v=$(sudo -n jq -r .client_email "$file");;
      PRIVATE_KEY) v=$(sudo -n jq -r .private_key "$file" | awk 'BEGIN{ORS="\\n"} {print}');;
    esac
    [ -n "$v" ] && [ "$v" != null ] || { say "ABORT FCM_${n}${sfx}: the field is empty in $file"; exit 1; }
    printf '%s=%s\n' "FCM_${n}${sfx}" "$v" >> "$LINES"
    say "FCM_${n}${sfx}: would be written from $(basename "$file")"
  done
}
add "" "$PRIMARY"
if [ -n "${FCM_SECONDARY_FILE:-}" ]; then is_sa "$FCM_SECONDARY_FILE" || { say "ABORT $FCM_SECONDARY_FILE is not a service-account JSON"; exit 1; }; add "_2" "$FCM_SECONDARY_FILE"; fi
if [ ! -s "$LINES" ]; then say "nothing to write: every FCM_* name is already set"; exit 0; fi
if [ "$APPLY" != yes ]; then say "dry run: $(grep -c . "$LINES") name(s) would be added to $ENVF (APPLY=yes to do it)"; exit 0; fi
BAK="$ENVF.bak-$(date -u +%Y%m%d-%H%M%S)"
sudo -n cp -p "$ENVF" "$BAK" && sudo -n chmod 600 "$BAK" || { say "ABORT could not back up $ENVF: nothing changed"; exit 1; }
sudo -n sh -c "[ -n \"\$(tail -c1 '$ENVF')\" ] && echo >> '$ENVF'; cat '$LINES' >> '$ENVF'" || { say "ABORT append failed, backup is $BAK"; exit 1; }
say "APPLIED: $(grep -c . "$LINES") name(s) added to $ENVF (backup $BAK); the backend and worker read them when recreated at the next deploy or by docker compose up -d backend worker"
