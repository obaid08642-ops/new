#!/bin/bash
# Is the scanner READY? READ-ONLY, one run. Checks the clamd that the backend uses (or a candidate one before anything is switched), from INSIDE the backend container, the way the API
# reaches it: PING, VERSION, a harmless text (must come back clean) and the standard EICAR test file (must come back as FOUND). Nothing is switched on, started, stopped or written.
# Prints `status:` lines only: names, counts, milliseconds; never the content of the environment and never the address of the scanner (only what KIND of address it is).
#   CLAMD_TEST_HOST / CLAMD_TEST_PORT (set in this file by the reviewer): test a CANDIDATE scanner (the new VM) BEFORE .env.production is changed. Empty: test the one the backend is configured for.
# The answer: scanner=ok|FAIL, the mode (UPLOAD_SCAN in the backend: required | defer | optional | unset), the kind of address (private | PUBLIC | dns-name | service-name), and
# ready_to_switch=yes|no with the reasons. To switch (docs/ops/REMOTE_CLAMD.md, step 7): CLAMD_HOST, CLAMD_PORT, UPLOAD_SCAN=required, CLAMAV_ON_DEMAND=0 in .env.production.
set -u
CLAMD_TEST_HOST=""
CLAMD_TEST_PORT=""
CT=${OPS_BACKEND_CONTAINER:-nabdah-backend}
DK="sudo -n docker"
echo "## clamd-check"
say() { echo "status: clamd-check: $*"; }
cenv() { $DK exec "$CT" printenv "$1" 2>/dev/null < /dev/null | head -1; }

HOST=${CLAMD_TEST_HOST:-$(cenv CLAMD_HOST)}
PORT=${CLAMD_TEST_PORT:-$(cenv CLAMD_PORT)}; PORT=${PORT:-3310}
MODE=$(cenv UPLOAD_SCAN); case "$MODE" in required|defer|optional) ;; "") MODE=unset;; *) MODE=set;; esac
SRC=$([ -n "$CLAMD_TEST_HOST" ] && echo candidate || echo configured)
kind() { case "$1" in
  "") echo none;;
  10.*|192.168.*|172.1[6-9].*|172.2[0-9].*|172.3[01].*|100.6[4-9].*|100.[7-9][0-9].*|100.1[01][0-9].*|100.12[0-7].*|127.*) echo private;;
  [0-9]*.[0-9]*.[0-9]*.[0-9]*) echo PUBLIC;;
  *.*) echo dns-name;;
  *) echo service-name;;
esac; }
KIND=$(kind "$HOST")
say "scanner under test: $SRC; address kind=$KIND port=$PORT; UPLOAD_SCAN in the backend=$MODE"
if [ "$KIND" = none ]; then say "no scanner configured (CLAMD_HOST unset in the backend): nothing to check; ready_to_switch=no"; exit 0; fi

# the same protocol the API speaks (backend/src/modules/storage/clamav.service.ts). The test file is built from parts: no virus-test string is stored in the repository.
JS=$(cat <<'JS'
const net=require('net');
const host=process.env.CHECK_HOST, port=Number(process.env.CHECK_PORT)||3310;
const ask=(send,ms)=>new Promise((res)=>{const t0=Date.now();const s=net.createConnection({host,port});const ch=[];let done=false;
  const end=(ok,txt)=>{if(!done){done=true;clearTimeout(tm);s.destroy();res({ok,txt:(txt||'').replace(/\0/g,'').trim(),ms:Date.now()-t0});}};
  const tm=setTimeout(()=>end(false,'timeout'),ms);s.on('error',(e)=>end(false,e.code||'error'));s.on('data',(c)=>ch.push(c));
  s.on('close',()=>end(true,Buffer.concat(ch).toString()));s.on('connect',()=>send(s));});
const stream=(buf)=>(s)=>{s.write('zINSTREAM\0');const n=Buffer.alloc(4);n.writeUInt32BE(buf.length,0);s.write(n);s.write(buf);s.write(Buffer.alloc(4));};
(async()=>{
  const ping=await ask((s)=>s.write('zPING\0'),3000);
  console.log('ping='+(ping.ok&&ping.txt==='PONG'?'ok':'FAIL('+ping.txt.slice(0,30)+')')+' ms='+ping.ms);
  const ver=await ask((s)=>s.write('zVERSION\0'),3000);
  console.log('version='+(ver.ok&&ver.txt?ver.txt.slice(0,70):'FAIL('+ver.txt.slice(0,30)+')'));
  const clean=await ask(stream(Buffer.from('nabd scanner check: harmless text')),15000);
  console.log('clean_file='+(clean.txt==='stream: OK'?'ok':'FAIL('+clean.txt.slice(0,40)+')')+' ms='+clean.ms);
  const t=['X5O!P%@AP[4\\PZX54(P^)7CC)7}$','EICAR-STANDARD-ANTIVIRUS-TEST-FILE!','$H+H*'].join('');
  const bad=await ask(stream(Buffer.from(t)),15000);
  console.log('test_virus='+(/^stream: .+ FOUND$/.test(bad.txt)?'found(ok)':'FAIL(not detected: '+bad.txt.slice(0,40)+')')+' ms='+bad.ms);
})();
JS
)
OUT=$($DK exec -e CHECK_HOST="$HOST" -e CHECK_PORT="$PORT" "$CT" node -e "$JS" 2>&1 < /dev/null)
echo "$OUT" | sed -n 's/^\(ping\|version\|clean_file\|test_virus\)=/status: clamd-check: \1=/p' | cut -c1-200
OK=yes
for k in ping clean_file test_virus; do echo "$OUT" | grep -q "^$k=\(ok\|found(ok)\)" || OK=no; done
[ "$OK" = yes ] && say "scanner=ok (answers, passes a clean file, catches the test virus)" || say "scanner=FAIL (see the lines above; unreachable, wrong port, firewall, or the signatures are not loaded yet)"

R=yes; WHY=""
[ "$OK" = yes ] || { R=no; WHY="$WHY scanner does not pass;"; }
[ "$KIND" = PUBLIC ] && { R=no; WHY="$WHY the address is PUBLIC (clamd has no login: use WireGuard or a private network);"; }
if [ "$SRC" = configured ] && [ "$MODE" = required ]; then say "switch is ON: UPLOAD_SCAN=required with this scanner; an upload is refused while it cannot answer, an unscanned file is never served"
else say "switch is OFF: UPLOAD_SCAN=$MODE in the backend (nothing was changed by this check)"; fi
say "ready_to_switch=$R${WHY:+ because:$WHY}"
