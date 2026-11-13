#!/bin/bash
# Launch server checks, READ-ONLY, names and counts only (no document, id, value, address, header or secret is printed; nothing is written):
#  1. TRUST_PROXY_HOPS of the backend container, next to what nginx says about the proxies in front of it (set_real_ip_from lines, real_ip_header lines). The client IP
#     (backend/src/common/client-ip.ts) is only right when the hops equal the real proxy count (nginx = 1, plus 1 when Cloudflare proxies in front).
#  2. MONGO_MAX_POOL_SIZE of every running container, on ONE line (only that one variable is read from each container's environment).
#  3. Counts of rows with NO owner (patient_id missing / null / empty): medicalreports, payments, appointments, labbookings, radiologybookings, homecarebookings. A row with no
#     owner is unreadable through the owner checks since PR "ownerless rows" (it used to be open to every caller).
#  4. Requests to /providers/enterprise/* in the nginx access log, by status class (the routes are admin only since the cross-tenant fix; the log has no role, so a 2xx before the
#     fix may have been a facility account, a 2xx after it is an admin). The nginx image links /var/log/nginx/access.log to the container's stdout, so the log is read with
#     `docker logs` (what docker keeps: at most 3 x 20 MB), never with `cat` inside the container (a read of a stdout link can block).
# EVERY step always prints at least one status line (a result, SKIP, REFUSE, TIMEOUT or ERROR with the exit code), every external command has a time limit, and the task ends with
# one "finished" line, so a log that stops early shows where. The Mongo counts run inside the backend container with its own environment (MONGO_URL / DB_NAME never reach a command
# line), 96 MB heap, 2-minute limit; that step REFUSES when the backend uses more than MAX_BACKEND_MEM_PERCENT (default 80) of its memory limit.
set -u
DK="sudo -n docker"
CT=${OPS_BACKEND_CONTAINER:-nabdah-backend}
NGX=${OPS_NGINX_CONTAINER:-nabdah-nginx}
MAXPCT=${MAX_BACKEND_MEM_PERCENT:-80}
say() { echo "status: launch-checks: $*"; }
mask() { sed -E 's#(mongodb(\+srv)?://)[^@/ ]*@#\1<hidden>@#g'; }
echo "## launch-server-checks (read-only)"
trap 'say "finished (exit code $?; steps 1 2 3 4 each printed their own line above)"' EXIT

envof() { # envof <container> <NAME>: the value of one environment variable, printed only if it is a plain token (digits, letters, dots, dashes)
  timeout 20 $DK inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$1" 2>/dev/null | sed -n "s/^$2=//p" | head -1 | grep -E '^[A-Za-z0-9._-]{1,32}$' || true
}
state_of() { timeout 20 $DK inspect -f '{{.State.Status}}' "$1" 2>/dev/null; }

bstate=$(state_of "$CT")
nstate=$(state_of "$NGX")
say "start: $CT is ${bstate:-unknown}, $NGX is ${nstate:-unknown}"

# 1. proxies
if [ "$bstate" = running ]; then
  hops=$(envof "$CT" TRUST_PROXY_HOPS)
  say "1 TRUST_PROXY_HOPS of $CT = ${hops:-unset (the code default 2 applies)}"
else
  say "1 SKIP: $CT is not running (state=${bstate:-unknown})"
fi
if [ "$nstate" = running ]; then
  conf=$(timeout 30 $DK exec "$NGX" sh -c 'cat /etc/nginx/nginx.conf /etc/nginx/conf.d/*.conf 2>/dev/null' < /dev/null 2>/dev/null); crc=$?
  if [ "$crc" = 0 ]; then
    say "1 nginx: set_real_ip_from lines=$(printf '%s\n' "$conf" | grep -c 'set_real_ip_from'), real_ip_header lines=$(printf '%s\n' "$conf" | grep -c 'real_ip_header'), proxy_add_x_forwarded_for lines=$(printf '%s\n' "$conf" | grep -c 'proxy_add_x_forwarded_for') (nginx itself is 1 hop; add 1 when Cloudflare proxies in front)"
  else
    say "1 ERROR: could not read the nginx config (exit code $crc)"
  fi
else
  say "1 SKIP nginx details: $NGX is not running (state=${nstate:-unknown})"
fi

# 2. pool sizes, one line
pools=""
for c in $(timeout 20 $DK ps --format '{{.Names}}' 2>/dev/null); do
  v=$(envof "$c" MONGO_MAX_POOL_SIZE)
  [ -n "$v" ] && pools="$pools $c=$v"
done
say "2 MONGO_MAX_POOL_SIZE:${pools:- none of the running containers sets it}"

# 3. ownerless rows
if [ "$bstate" != running ]; then
  say "3 SKIP: $CT is not running (state=${bstate:-unknown})"
else
  pct=$(timeout 30 $DK stats --no-stream --format '{{.MemPerc}}' "$CT" 2>/dev/null | tr -d '% ' | cut -d. -f1)
  pct=${pct:-0}
  if [ "$pct" -gt "$MAXPCT" ] 2>/dev/null; then
    say "3 REFUSE: $CT is above ${MAXPCT}% of its memory limit (${pct}%); run it when it is quieter"
  else
    js='const {MongoClient}=require("mongoose").mongo;(async()=>{const c=await MongoClient.connect(process.env.MONGO_URL,{maxPoolSize:1});const db=c.db(process.env.DB_NAME);const have=new Set((await db.listCollections({},{nameOnly:true}).toArray()).map(x=>x.name));for(const n of ["medicalreports","payments","appointments","labbookings","radiologybookings","homecarebookings"]){if(!have.has(n)){console.log("ownerless: "+n+" collection absent");continue}const k=await db.collection(n).countDocuments({$or:[{patient_id:{$exists:false}},{patient_id:null},{patient_id:""}]});console.log("ownerless: "+n+" rows_without_patient_id="+k)}await c.close()})().catch(e=>{console.log("failed: "+String(e&&e.message||e).slice(0,120));process.exit(1)})'
    out=$(timeout 120 $DK exec -e NODE_OPTIONS=--max-old-space-size=96 "$CT" node -e "$js" 2>&1 < /dev/null); rc=$?
    found=0
    while IFS= read -r l; do
      case "$l" in
        ownerless:*) say "3 ${l#ownerless: }"; found=1 ;;
        failed:*)    say "3 ERROR: $(printf '%s' "$l" | mask | cut -c1-200)"; found=1 ;;
      esac
    done < <(printf '%s\n' "$out")
    if [ "$rc" = 124 ]; then say "3 TIMEOUT: stopped after 2 minutes (read-only; nothing to undo)"; found=1
    elif [ "$found" = 0 ]; then
      first=$(printf '%s\n' "$out" | grep -v '^[[:space:]]*$' | head -1 | mask | cut -c1-160)
      say "3 ERROR: the counting script printed no result (exit code $rc); first line: ${first:-none}"
    elif [ "$rc" != 0 ]; then say "3 the counting script exited with code $rc"; fi
  fi
fi

# 4. /providers/enterprise/* in the nginx log (log_format main: "... "METHOD /path HTTP/x" STATUS ...")
if [ "$nstate" != running ]; then
  say "4 SKIP: $NGX is not running (state=${nstate:-unknown})"
else
  total=$(timeout 60 $DK logs "$NGX" 2>/dev/null < /dev/null | grep -c '"[A-Z]* /api/')
  lines=$(timeout 60 $DK logs "$NGX" 2>/dev/null < /dev/null | grep '/providers/enterprise/' | sed -nE 's/.*" ([0-9]{3}) .*/\1/p' | cut -c1 | sort | uniq -c)
  if [ -n "$lines" ]; then
    printf '%s\n' "$lines" | while read -r n cls; do say "4 /providers/enterprise/* status ${cls}xx: $n requests (of $total API requests kept in the nginx docker log)"; done
  else
    say "4 /providers/enterprise/*: 0 requests in the nginx docker log (it holds $total API requests; docker keeps at most 3 x 20 MB)"
  fi
fi
