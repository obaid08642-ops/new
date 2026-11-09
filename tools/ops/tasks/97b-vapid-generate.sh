#!/bin/bash
# Generates a VAPID pair ON THE SERVER and writes it to the env file. Prints names only, never the keys.
# Refuses to overwrite an existing pair.
set -e
D=/opt/nabdah/deploy; F=$D/.env
sudo -n grep -q '^WEB_PUSH_VAPID_PRIVATE_KEY=.\+' "$F" 2>/dev/null && { echo "SKIP  WEB_PUSH_VAPID_* already set"; exit 0; }
OUT=$(sudo -n docker exec nabdah-backend node -e "const w=require('web-push');const k=w.generateVAPIDKeys();console.log(k.publicKey+' '+k.privateKey)")
PUB=${OUT% *}; PRIV=${OUT#* }
printf 'WEB_PUSH_VAPID_PUBLIC_KEY=%s\nWEB_PUSH_VAPID_PRIVATE_KEY=%s\nWEB_PUSH_VAPID_SUBJECT=mailto:support@nabdahplus.com\n' "$PUB" "$PRIV" | sudo -n tee -a "$F" >/dev/null
echo "WROTE WEB_PUSH_VAPID_PUBLIC_KEY WEB_PUSH_VAPID_PRIVATE_KEY WEB_PUSH_VAPID_SUBJECT to $F (restart the backend to load them)"
