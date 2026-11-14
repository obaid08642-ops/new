#!/bin/bash
# READ-ONLY. Prints OK or MISSING per push key, NAMES ONLY. Never prints a value.
set +e
D=/opt/nabdah/deploy
ENVF=""
for f in $D/.env $D/.env.production /opt/nabdah/.env; do [ -f "$f" ] && ENVF="$ENVF $f"; done
has() { # name -> OK/MISSING (non-empty in any env file or in the backend container)
  local n="$1" v=""
  [ -n "$ENVF" ] && v=$(sudo -n grep -h -E "^${n}=.+" $ENVF 2>/dev/null | head -1)
  [ -z "$v" ] && v=$(sudo -n docker exec nabdah-backend sh -c "printenv $n" 2>/dev/null)
  if [ -n "$v" ]; then echo "OK       $n"; else echo "MISSING  $n"; fi
}
echo "## Android (FCM HTTP v1)"
for n in FCM_PROJECT_ID FCM_CLIENT_EMAIL FCM_PRIVATE_KEY; do has $n; done
echo "## iOS (APNs token key, alert + VoIP)"
for n in APNS_KEY_ID APNS_TEAM_ID APNS_AUTH_KEY APNS_BUNDLE_ID; do has $n; done
echo "## Web Push (VAPID)"
for n in WEB_PUSH_VAPID_PUBLIC_KEY WEB_PUSH_VAPID_PRIVATE_KEY WEB_PUSH_VAPID_SUBJECT; do has $n; done
