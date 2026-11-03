#!/bin/bash
# R7. Adds a standby to the replica set in two safe phases. A set with 2 voting members is WORSE than 1 (losing either one stops the primary), so a data member is never
# added with a vote, and the arbiter that completes the third vote goes in together with the secondary's vote, in one reconfig.
#   PHASE=data  adds DATA_HOST as hidden, priority 0, votes 0. It copies the data (initial sync) and costs nothing in availability.
#   PHASE=vote  once DATA_HOST is SECONDARY with lag under MAX_LAG_SEC: sets default write concern w:1 (required before an arbiter), gives DATA_HOST a vote and adds
#               ARB_HOST as arbiter in one reconfig = 3 voting members (primary, secondary, arbiter).
#   Run 1 (APPLY empty): DRY RUN. Prints the current members and the exact reconfig it would send. Changes nothing.
#   Run 2 (APPLY=yes): does it. ROLLBACK=yes removes DATA_HOST and ARB_HOST again (and nothing else).
# Before the first run: mongod members must reach each other over a private link (WireGuard), never over the public internet; the primary's own member host must be
# changed from a Docker alias to an address the standby can reach (the status task prints it); keyFile and TLS as in docs/platform/R7-data-tier.md.
# Hosts are host:port, set below (a hostname or tunnel address, not a secret).
set -u
APPLY=""
ROLLBACK=""
PHASE=""
DATA_HOST=""
ARB_HOST=""
[ -n "$PHASE" ] || PHASE=data
MAX_LAG_SEC=${MAX_LAG_SEC:-30}
DK="sudo -n docker"; CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
q() { $DK exec $CT sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null; }
say() { echo "status: mongo-rs-member: $*"; }
echo "## mongo-rs-member"
case "$DATA_HOST$ARB_HOST" in *[\'\"\;\$\`\ ]*) say "ABORT hosts must be plain host:port"; exit 1;; esac
[ -n "$DATA_HOST" ] || { say "ABORT DATA_HOST is empty (host:port of the standby)"; exit 1; }
say "members now: $(q 'print(rs.conf().members.map(m=>m.host+"(votes="+m.votes+(m.hidden?",hidden":"")+(m.arbiterOnly?",arbiter":"")+")").join(" "))' | tail -1)"

if [ "$ROLLBACK" = yes ]; then
  for h in "$ARB_HOST" "$DATA_HOST"; do [ -n "$h" ] && q "rs.remove('$h')" >/dev/null; done
  say "rolled back: removed ${ARB_HOST:+$ARB_HOST }$DATA_HOST (the default write concern is left as it is)"; exit 0
fi

DATA_JS="const c=rs.conf(); const id=Math.max(...c.members.map(m=>m._id))+1; c.members.push({_id:id, host:'$DATA_HOST', priority:0, hidden:true, votes:0}); c.version++; printjson(rs.reconfig(c).ok)"
VOTE_JS="db.adminCommand({setDefaultRWConcern:1, defaultWriteConcern:{w:1}}); const c=rs.conf(); const d=c.members.find(m=>m.host==='$DATA_HOST'); const id=Math.max(...c.members.map(m=>m._id))+1; d.votes=1; c.members.push({_id:id, host:'$ARB_HOST', arbiterOnly:true, priority:0, votes:1}); c.version++; printjson(rs.reconfig(c).ok)"
case "$PHASE" in
  data) JS=$DATA_JS ;;
  vote) [ -n "$ARB_HOST" ] || { say "ABORT PHASE=vote needs ARB_HOST"; exit 1; }
        ST=$(q "const s=rs.status(); const p=s.members.find(m=>m.stateStr==='PRIMARY'); const m=s.members.find(x=>x.name==='$DATA_HOST'); print(m?m.stateStr+' '+Math.round((p.optimeDate-m.optimeDate)/1000):'absent')" | tail -1)
        say "$DATA_HOST is: $ST (needs: SECONDARY with lag <= ${MAX_LAG_SEC}s)"
        case "$ST" in "SECONDARY "*) LAG=${ST#SECONDARY }; [ "$LAG" -le "$MAX_LAG_SEC" ] 2>/dev/null || { say "ABORT lag $LAG s is above $MAX_LAG_SEC s: wait for the initial sync to catch up"; exit 1; } ;; *) say "ABORT $DATA_HOST is not a synced SECONDARY yet"; exit 1 ;; esac
        JS=$VOTE_JS ;;
  *) say "ABORT PHASE must be data or vote"; exit 1 ;;
esac
if [ "$APPLY" != yes ]; then say "dry run only: nothing was changed. PHASE=$PHASE would run: $JS"; exit 0; fi
R=$(q "$JS" | tail -1)
[ "$R" = 1 ] || { say "ABORT reconfig answered '$R'; the set is unchanged or needs a look (run 100-mongo-rs-status)"; exit 1; }
say "applied PHASE=$PHASE: $(q 'print(rs.conf().members.map(m=>m.host+"(votes="+m.votes+")").join(" "))' | tail -1)"
