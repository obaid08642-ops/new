#!/bin/bash
# READ-ONLY (2026-10-25). Which of the external-service settings the backend reads are present in .env.production.
# Prints a NAME and "set" / "missing" only: a value is never read into a variable or printed (grep -q on "NAME=" + one char).
set +e
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
echo "## env-names"
sudo -n test -f "$ENVF" || { echo "status: env-names: ABORT $ENVF missing"; exit 1; }
check() { local g=$1; shift; local set="" miss=""; for n in "$@"; do if sudo -n grep -qE "^${n}=.+" "$ENVF"; then set="$set $n"; else miss="$miss $n"; fi; done
  echo "status: env $g set:${set:- none}"; echo "status: env $g missing:${miss:- none}"; }
check social GOOGLE_OAUTH_CLIENT_IDS GOOGLE_WEB_CLIENT_ID GOOGLE_IOS_CLIENT_ID GOOGLE_ANDROID_CLIENT_ID APPLE_SIGNIN_CLIENT_IDS APPLE_WEB_CLIENT_ID APPLE_REDIRECT_URI X_CLIENT_ID X_CLIENT_SECRET SNAPCHAT_CLIENT_ID SNAPCHAT_CLIENT_SECRET SOCIAL_REDIRECT_URIS
check payment PAYMENT_PROVIDER MOYASAR_API_KEY MOYASAR_SECRET_KEY MOYASAR_WEBHOOK_SECRET
check sms SMS_ENABLED UNIFONIC_APP_ID SMS_WEBOTP_HASH
check push FCM_PROJECT_ID FCM_CLIENT_EMAIL FCM_PRIVATE_KEY APNS_KEY_ID APNS_TEAM_ID APNS_AUTH_KEY APNS_BUNDLE_ID
check calls LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET COTURN_SECRET COTURN_HOST TURN_URLS
check mail BREVO_API_KEY MAILJET_API_KEY MAILJET_SECRET_KEY
check address SPL_API_KEY
check monitoring SENTRY_DSN
check uploads UPLOAD_SCAN CLAMD_HOST
echo "## env-names done"
