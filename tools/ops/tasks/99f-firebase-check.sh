#!/bin/bash
# Firebase / push readiness (lead reviewer, 2026-11-02), READ-ONLY. The owner says four Firebase files are on the server (Android and iOS for the patient
# app and the provider app). Prints, without any secret:
#   1. every google-services*.json / GoogleService-Info*.plist / *firebase*adminsdk*.json under /opt/nabdah and /root, by path, with only the PUBLIC
#      identifiers: project_id, the Android package names / iOS bundle id inside, and for a service-account file its type and client_email domain;
#      never api keys, private keys or client ids
#   2. which push env NAMES are set in .env.production (FCM_*/FIREBASE_*/APNS_*/EXPO_ACCESS_TOKEN), never values
#   3. whether the running backend sees FCM credentials (true/false) and the app ids the apps are built with (com.* from the repo's app configs)
# Public lines start with "status:".
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}; ENVF=$D/.env.production; DK="sudo -n docker"
say() { echo "status: firebase: $*"; }
FILES=$(sudo -n find /opt/nabdah /root /home -maxdepth 6 \( -iname 'google-services*.json' -o -iname 'GoogleService-Info*.plist' -o -iname '*firebase*adminsdk*.json' -o -iname '*service-account*.json' \) -not -path '*/node_modules/*' 2>/dev/null)
[ -n "$FILES" ] || say "no Firebase file found under /opt/nabdah, /root, /home"
n=0
while IFS= read -r f; do
  [ -n "$f" ] || continue; n=$((n+1))
  case "$f" in
    *.plist)
      pid=$(sudo -n grep -A1 '<key>PROJECT_ID</key>' "$f" | sed -n 's/.*<string>\(.*\)<\/string>.*/\1/p' | head -1)
      bid=$(sudo -n grep -A1 '<key>BUNDLE_ID</key>' "$f" | sed -n 's/.*<string>\(.*\)<\/string>.*/\1/p' | head -1)
      say "file $n iOS plist: path=$f project_id=${pid:-?} bundle_id=${bid:-?}";;
    *)
      t=$(sudo -n jq -r 'if .type then .type elif .project_info then "google-services" else "unknown" end' "$f" 2>/dev/null)
      if [ "$t" = "google-services" ]; then
        say "file $n Android: path=$f project_id=$(sudo -n jq -r '.project_info.project_id' "$f") packages=$(sudo -n jq -r '[.client[].client_info.android_client_info.package_name] | join(",")' "$f")"
      else
        say "file $n json type=$t path=$f project_id=$(sudo -n jq -r '.project_id // "?"' "$f") client_email_domain=$(sudo -n jq -r '.client_email // "" | split("@")[1] // "?"' "$f") has_private_key=$(sudo -n jq -r 'has("private_key")' "$f")"
      fi;;
  esac
done <<< "$FILES"
say "files found: $n"
S=""; M=""
for v in FCM_PROJECT_ID FCM_CLIENT_EMAIL FCM_PRIVATE_KEY FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY APNS_KEY_ID APNS_TEAM_ID APNS_AUTH_KEY APNS_BUNDLE_ID EXPO_ACCESS_TOKEN; do
  sudo -n grep -qE "^$v=.+" "$ENVF" 2>/dev/null && S="$S $v" || M="$M $v"
done
say "env set:${S:- none}"; say "env missing:${M:- none}"
say "backend sees FCM credentials: $($DK exec nabdah-backend sh -c '[ -n "${FCM_PROJECT_ID:-$FIREBASE_PROJECT_ID}" ] && [ -n "${FCM_CLIENT_EMAIL:-$FIREBASE_CLIENT_EMAIL}" ] && [ -n "${FCM_PRIVATE_KEY:-$FIREBASE_PRIVATE_KEY}" ] && echo true || echo false' 2>/dev/null | tr -d '\r')"
say "done (read-only)"
