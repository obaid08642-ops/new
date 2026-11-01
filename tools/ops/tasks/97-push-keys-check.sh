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

# ---- Firebase files on the server and how the backend reads them (names, paths and OK/MISSING only; never a value)
# The backend (modules/push/push.module.ts fcmProjects) reads the service account from ENVIRONMENT VALUES FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY (and _2 for the second project), set
# by env_file .env.production. It does NOT read a JSON file path. So a service-account JSON that only lies on the server is NOT wired until its three fields are in the env file (97d-fcm-wire.sh).
# google-services.json and GoogleService-Info.plist are BUILD-time files for the apps (EAS), not used by the server.
ROOTS=${OPS_FIREBASE_ROOTS:-"/opt/nabdah /root /home /etc/nabdah /srv"}
PRUNE='-name node_modules -o -name .git -o -name .next -o -name backups -o -name releases'
echo "## Firebase files found on the server (kind, path)"
SA=""
for r in $ROOTS; do
  sudo -n test -d "$r" || continue
  for f in $(sudo -n find "$r" -maxdepth 5 \( $PRUNE \) -prune -o -type f -name '*.json' -size -16k -print 2>/dev/null); do
    sudo -n grep -q '"type"[[:space:]]*:[[:space:]]*"service_account"' "$f" 2>/dev/null || continue
    miss=""; for k in project_id client_email private_key; do sudo -n grep -q "\"$k\"" "$f" 2>/dev/null || miss="$miss $k"; done
    if [ -z "$miss" ]; then echo "OK       service-account JSON  $f  (has project_id, client_email, private_key)"; SA="$SA $f"; else echo "BROKEN   service-account JSON  $f  (missing:$miss)"; fi
  done
  for f in $(sudo -n find "$r" -maxdepth 5 \( $PRUNE \) -prune -o -type f \( -name google-services.json -o -name GoogleService-Info.plist \) -print 2>/dev/null); do
    echo "OK       $(basename "$f")  $f  (build-time file for an app, not read by the server)"
  done
done
[ -n "$SA" ] || echo "MISSING  service-account JSON  (no *.json with type service_account under: $ROOTS)"
echo "## Wired? (backend reads env values)"
envhas() { local n="$1"; local fv=""; [ -n "$ENVF" ] && fv=$(sudo -n grep -h -E "^${n}=.+" $ENVF 2>/dev/null | head -1); local cv; cv=$(sudo -n docker exec nabdah-backend sh -c "printenv $n" 2>/dev/null); echo "$n env_file:$([ -n "$fv" ] && echo yes || echo no) running_container:$([ -n "$cv" ] && echo yes || echo no)"; }
for n in FCM_PROJECT_ID FCM_CLIENT_EMAIL FCM_PRIVATE_KEY FCM_PROJECT_ID_2 FCM_CLIENT_EMAIL_2 FCM_PRIVATE_KEY_2; do envhas $n; done
if [ -n "$SA" ] && ! sudo -n docker exec nabdah-backend sh -c 'test -n "$FCM_PROJECT_ID" && test -n "$FCM_CLIENT_EMAIL" && test -n "$FCM_PRIVATE_KEY"' 2>/dev/null; then
  echo "FOUND_NOT_WIRED  a service-account JSON exists but the backend container has no FCM_* values: run 97d-fcm-wire.sh (dry run first)"
fi
echo "## Build-time files (EAS), names only"
echo "patient-app/app.json points android.googleServicesFile at ./google-services.json and ios.googleServicesFile at ./GoogleService-Info.plist; provider-app/app.json has no googleServicesFile entry."
echo "CI refuses to commit these files (patient-production-ci.yml), and app.config.js does not map an EAS file-secret variable, so a cloud EAS build has neither file until app.config.js reads one (for example GOOGLE_SERVICES_JSON and GOOGLE_SERVICES_INFO_PLIST as EAS file secrets)."
