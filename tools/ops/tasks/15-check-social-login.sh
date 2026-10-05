#!/bin/bash
# READ-ONLY. Is production running the social-login code that trusts unsigned tokens (main before
# Q107: verifyXToken / verifySnapchatToken / verifyAppleToken decode the JWT without checking it,
# or invent an address), and are there signs it was used?
# Prints code markers, counts and dates only: no email, name, id or secret value.
# v2: v1 found no file (bundle name differs), no Mongo output and no nginx lines; v2 searches the
# whole app dir, counts from the backend's own DB connection, and reads nginx's access_log target.
set +e
T() { timeout 90 "$@"; }
DK="sudo -n docker"
mask() { sed -E 's#(://)[^:@/ ]+:[^@/ ]+@#\1***:***@#g'; }
echo "## check-social-login v2"
echo "-- containers: $($DK ps --format '{{.Names}}' | tr '\n' ' ')"

echo "-- code in the running backend"
T $DK exec nabdah-backend sh -c '
  echo "workdir: $(pwd)"
  files=$(grep -rlE --include=*.js "verifyXToken|socialLogin" . 2>/dev/null | grep -v node_modules | head -5)
  echo "files with socialLogin: $(echo $files | wc -w)"
  for f in $files; do
    echo "file: $f"
    for m in verifyXToken verifySnapchatToken x_user_ snapchat_user_ social_provider_not_supported appleid.apple.com/auth/keys GOOGLE_OAUTH_CLIENT_IDS password_login_required; do
      echo "  $m: $(grep -c "$m" "$f")"
    done
  done' 2>&1 | mask

echo "-- nginx access log target"
T $DK exec nabdah-nginx nginx -T 2>/dev/null | grep -E '^\s*access_log' | sort -u | head -5
echo "-- POST social-login in the access logs: status counts (file logs + container log)"
T $DK exec nabdah-nginx sh -c 'for f in /var/log/nginx/*access*.log /var/log/nginx/*access*.log.1; do [ -f "$f" ] && grep -h "POST /api/v1/auth/social-login" "$f"; done; for f in /var/log/nginx/*access*.log.*.gz; do [ -f "$f" ] && zcat "$f" | grep -h "POST /api/v1/auth/social-login"; done' 2>/dev/null > /tmp/sl.txt
T $DK logs --since 720h nabdah-nginx 2>&1 | grep -h "POST /api/v1/auth/social-login" >> /tmp/sl.txt
echo "lines: $(wc -l < /tmp/sl.txt)"
grep -oE '" [0-9]{3} ' /tmp/sl.txt | sort | uniq -c
echo "days seen: $(grep -oE '\[[0-9]{2}/[A-Za-z]{3}/[0-9]{4}' /tmp/sl.txt | sort -u | tr '\n' ' ')"
rm -f /tmp/sl.txt

echo "-- accounts (counts only, through the backend's own DB connection)"
T $DK exec nabdah-backend node -e '
  const mongoose = require("mongoose");
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!uri) { console.log("no mongo uri env"); process.exit(0); }
  (async () => {
    const c = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 15000, dbName: process.env.DB_NAME || undefined }).asPromise();
    const u = c.db.collection("users");
    const made = { email: { $regex: "(^(x_user_|snapchat_user_)[0-9]*@nabd\\.app$)|(@(twitter|snapchat)\\.com$)" } };
    const noPw = { $or: [{ password_hash: "" }, { password_hash: { $exists: false } }, { password_hash: null }] };
    const byRole = await u.aggregate([{ $match: noPw }, { $group: { _id: "$role", n: { $sum: 1 } } }]).toArray();
    const last = await u.find(made).sort({ created_at: -1 }).limit(1).project({ created_at: 1 }).toArray();
    console.log("db:", c.db.databaseName, "| users:", await u.countDocuments({}));
    console.log("invented-address accounts:", await u.countDocuments(made), "| newest:", last[0] && last[0].created_at ? new Date(last[0].created_at).toISOString().slice(0, 10) : "-");
    console.log("accounts without a password, by role:", byRole.map((r) => r._id + "=" + r.n).join(" ") || "none");
    await c.close();
  })().catch((e) => { console.log("db error:", String(e && e.name), String(e && e.message).slice(0, 160)); process.exit(0); });
' 2>&1 | mask | head -10

echo "-- nginx rule for social-login now"
T $DK exec nabdah-nginx nginx -T 2>/dev/null | grep -nE 'social-login' | head -5
echo "## check-social-login done"
