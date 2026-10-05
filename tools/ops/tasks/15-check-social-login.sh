#!/bin/bash
# READ-ONLY. Is production running the social-login code that trusts unsigned tokens (main before
# Q107: verifyXToken / verifySnapchatToken / verifyAppleToken decode the JWT without checking it,
# or invent an address), and are there signs it was used?
# Prints code markers, counts and dates only: no email, name, id or secret value.
set +e
T() { timeout 40 "$@"; }
DK="sudo -n docker"
echo "## check-social-login"

echo "-- code in the running backend"
T $DK exec nabdah-backend sh -c '
  f=$(grep -rl --include=*.js "socialLogin" /app/dist /usr/src/app/dist /app 2>/dev/null | grep -i "auth.service" | head -1)
  [ -z "$f" ] && f=$(grep -rl --include=*.js "socialLogin" / 2>/dev/null | grep -v node_modules | grep -i "auth.service" | head -1)
  echo "file: ${f:-not found}"
  [ -n "$f" ] || exit 0
  for m in verifyXToken verifySnapchatToken x_user_ snapchat_user_ social_provider_not_supported appleid.apple.com/auth/keys GOOGLE_OAUTH_CLIENT_IDS password_login_required; do
    echo "$m: $(grep -c "$m" "$f")"
  done' 2>&1

echo "-- social-login requests seen by nginx (container log, last 30 days): status counts"
T $DK logs --since 720h nabdah-nginx 2>&1 | grep -E '"POST /api/v1/auth/social-login' | grep -oE '" [0-9]{3} ' | sort | uniq -c
echo "first and last day:"
T $DK logs --since 720h nabdah-nginx 2>&1 | grep -E '"POST /api/v1/auth/social-login' | grep -oE '\[[0-9]{2}/[A-Za-z]{3}/[0-9]{4}' | sort -u | sed -n '1p;$p'

echo "-- accounts the vulnerable code would create or reach (counts only)"
T $DK exec nabdah-mongodb sh -c '
  U="${MONGO_INITDB_ROOT_USERNAME:-}"; P="${MONGO_INITDB_ROOT_PASSWORD:-}"
  A=""; [ -n "$U" ] && A="-u $U -p $P --authenticationDatabase admin"
  mongosh --quiet $A --eval "
    const out = [];
    for (const d of db.adminCommand({ listDatabases: 1, nameOnly: true }).databases) {
      const x = db.getSiblingDB(d.name);
      if (!x.getCollectionNames().includes(\"users\")) continue;
      const made = { email: { \$regex: \"(^(x_user_|snapchat_user_)[0-9]*@nabd\\\\.app\$)|(@(twitter|snapchat)\\\\.com\$)\" } };
      const noPw = { \$or: [ { password_hash: \"\" }, { password_hash: { \$exists: false } } ] };
      const byRole = x.users.aggregate([ { \$match: noPw }, { \$group: { _id: \"\$role\", n: { \$sum: 1 } } } ]).toArray().map(r => r._id + \"=\" + r.n).join(\" \");
      const last = x.users.find(made).sort({ created_at: -1 }).limit(1).toArray()[0];
      out.push(d.name + \": invented-address accounts=\" + x.users.countDocuments(made)
        + \"; accounts without a password by role: \" + (byRole || \"none\")
        + \"; newest invented-address account created: \" + (last && last.created_at ? last.created_at.toISOString().slice(0, 10) : \"-\"));
    }
    print(out.join(\"\\n\") || \"no database with a users collection\");
  "' 2>&1 | grep -viE 'password|secret' | head -20

echo "-- nginx rule for social-login now"
T $DK exec nabdah-nginx nginx -T 2>/dev/null | grep -nE 'social-login' | head -5
echo "## check-social-login done"
