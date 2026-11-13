#!/bin/bash
# Launch server checks, READ-ONLY, names and counts only (no document, id, value, address, header or secret is printed; nothing is written):
#  1. TRUST_PROXY_HOPS of the backend container, next to what nginx says about the proxies in front of it (set_real_ip_from lines, real_ip_header). The client IP
#     (backend/src/common/client-ip.ts) is only right when the hops equal the real proxy count (nginx = 1, plus 1 when Cloudflare proxies in front).
#  2. MONGO_MAX_POOL_SIZE of every running container (only that one variable is read from each container's environment).
#  3. Counts of rows with NO owner (patient_id missing / null / empty): medicalreports, payments, appointments, labbookings, radiologybookings, homecarebookings. A row with no
#     owner is unreadable through the owner checks since PR "ownerless rows" (it used to be open to every caller).
#  4. Requests to /providers/enterprise/* in the nginx access log, by status class (the routes are admin only since the cross-tenant fix; the log has no role, so a 2xx before the
#     fix may have been a facility account, a 2xx after it is an admin). Counts per status class only.
# The Mongo counts run inside the backend container with its own environment (MONGO_URL / DB_NAME never reach a command line) with a 96 MB heap and a 2-minute limit, and the
# task REFUSES that step when the backend uses more than MAX_BACKEND_MEM_PERCENT (default 80) of its memory limit. Each step stands alone: one failing never stops the others.
set -u
DK="sudo -n docker"
CT=${OPS_BACKEND_CONTAINER:-nabdah-backend}
NGX=${OPS_NGINX_CONTAINER:-nabdah-nginx}
MAXPCT=${MAX_BACKEND_MEM_PERCENT:-80}
say() { echo "status: launch-checks: $*"; }
echo "## launch-server-checks (read-only)"

envof() { # envof <container> <NAME>: the value of one environment variable, printed only if it is a plain token (digits, letters, dots, dashes)
  $DK inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$1" 2>/dev/null | sed -n "s/^$2=//p" | head -1 | grep -E '^[A-Za-z0-9._-]{1,32}$' || true
}

# 1. proxies
state=$($DK inspect -f '{{.State.Status}}' "$CT" 2>/dev/null)
if [ "$state" = running ]; then
  hops=$(envof "$CT" TRUST_PROXY_HOPS)
  say "1 TRUST_PROXY_HOPS of $CT = ${hops:-unset (the code default applies)}"
else
  say "1 SKIP: $CT is not running (state=${state:-unknown})"
fi
if [ "$($DK inspect -f '{{.State.Status}}' "$NGX" 2>/dev/null)" = running ]; then
  conf=$($DK exec "$NGX" sh -c 'cat /etc/nginx/nginx.conf /etc/nginx/conf.d/*.conf 2>/dev/null' < /dev/null)
  real_from=$(printf '%s\n' "$conf" | grep -c 'set_real_ip_from')
  real_hdr=$(printf '%s\n' "$conf" | grep -c 'real_ip_header')
  xff_add=$(printf '%s\n' "$conf" | grep -c 'proxy_add_x_forwarded_for')
  say "1 nginx: set_real_ip_from lines=$real_from, real_ip_header lines=$real_hdr, proxy_add_x_forwarded_for lines=$xff_add (nginx itself is 1 hop; add 1 when Cloudflare proxies in front)"
else
  say "1 SKIP nginx details: $NGX is not running"
fi

# 2. pool sizes
for c in $($DK ps --format '{{.Names}}' 2>/dev/null); do
  v=$(envof "$c" MONGO_MAX_POOL_SIZE)
  [ -n "$v" ] && say "2 MONGO_MAX_POOL_SIZE $c = $v"
done
say "2 done (containers without the variable are not listed)"

# 3. ownerless rows
if [ "$state" = running ]; then
  pct=$($DK stats --no-stream --format '{{.MemPerc}}' "$CT" 2>/dev/null | tr -d '% ' | cut -d. -f1)
  pct=${pct:-0}
  if [ "$pct" -gt "$MAXPCT" ] 2>/dev/null; then
    say "3 REFUSE: $CT is above ${MAXPCT}% of its memory limit (${pct}%); run it when it is quieter"
  else
    js='const {MongoClient}=require("mongodb");(async()=>{const c=await MongoClient.connect(process.env.MONGO_URL,{maxPoolSize:1});const db=c.db(process.env.DB_NAME);const have=new Set((await db.listCollections({},{nameOnly:true}).toArray()).map(x=>x.name));for(const n of ["medicalreports","payments","appointments","labbookings","radiologybookings","homecarebookings"]){if(!have.has(n)){console.log("ownerless: "+n+" collection absent");continue}const k=await db.collection(n).countDocuments({$or:[{patient_id:{$exists:false}},{patient_id:null},{patient_id:""}]});console.log("ownerless: "+n+" rows_without_patient_id="+k)}await c.close()})().catch(e=>{console.log("failed: "+String(e&&e.message||e).slice(0,120));process.exit(1)})'
    out=$(timeout 120 $DK exec -e NODE_OPTIONS=--max-old-space-size=96 "$CT" node -e "$js" 2>&1 < /dev/null); rc=$?
    printf '%s\n' "$out" | grep -E '^(ownerless:|failed:)' | sed -E 's#(mongodb(\+srv)?://)[^@/ ]*@#\1<hidden>@#g' | cut -c1-200 | while IFS= read -r l; do
      case "$l" in ownerless:*) say "3 ${l#ownerless: }" ;; *) say "3 ERROR: $l" ;; esac
    done
    [ "$rc" = 124 ] && say "3 TIMEOUT after 2 minutes (read-only; nothing to undo)"
  fi
else
  say "3 SKIP: $CT is not running"
fi

# 4. /providers/enterprise/* in the nginx log (log_format main: "... "METHOD /path HTTP/x" STATUS ...")
if [ "$($DK inspect -f '{{.State.Status}}' "$NGX" 2>/dev/null)" = running ]; then
  lines=$($DK exec "$NGX" sh -c 'cat /var/log/nginx/access.log /var/log/nginx/access.log.1 2>/dev/null | grep "/providers/enterprise/" | sed -E "s/.*\" ([0-9]{3}) .*/\1/" | cut -c1-1 | sort | uniq -c' < /dev/null)
  if [ -n "$lines" ]; then
    printf '%s\n' "$lines" | while read -r n cls; do say "4 /providers/enterprise/* status ${cls}xx: $n requests"; done
  else
    say "4 /providers/enterprise/*: 0 requests in the current and previous nginx log"
  fi
else
  say "4 SKIP: $NGX is not running"
fi
say "done (read-only; nothing was written)"
