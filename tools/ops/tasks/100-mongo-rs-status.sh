#!/bin/bash
# R7. READ-ONLY. Is the replica set healthy, how far behind is every member, how long a window does the oplog cover (the PITR slices and a returning secondary both need it), how
# many connections are open against the limit, and how old is the newest oplog slice that was shipped off the server (the RPO today). Names and numbers only.
set -u
DK="sudo -n docker"; CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
q() { $DK exec $CT sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null; }
say() { echo "status: mongo-rs: $*"; }
echo "## mongo-rs-status"
say "set: $(q 'const s=rs.status(); print(s.set+" members="+s.members.length+" myState="+s.myState)' | tail -1)"
q 'const s=rs.status(); const p=s.members.find(m=>m.stateStr==="PRIMARY"); const c=rs.conf(); s.members.forEach(m=>{const cm=c.members.find(x=>x._id===m._id)||{}; const lag=(p&&m.optimeDate&&p.optimeDate)?Math.round((p.optimeDate-m.optimeDate)/1000):"?"; print(m.name+" "+m.stateStr+" health="+m.health+" lagSec="+lag+" priority="+cm.priority+" votes="+cm.votes+" hidden="+!!cm.hidden+" arbiter="+!!cm.arbiterOnly)})' | sed 's/^/status: mongo-rs: member /'
say "voting members: $(q 'print(rs.conf().members.filter(m=>m.votes>0).length)' | tail -1) (a set needs an odd number of votes to survive losing one member; 1 today means no failover)"
say "oplog window: $(q 'const r=db.getReplicationInfo(); print(r.timeDiffHours+" h, "+Math.round(r.usedMB)+" MB used of "+Math.round(r.logSizeMB)+" MB")' | tail -1)"
say "connections: $(q 'const c=db.serverStatus().connections; print("current="+c.current+" available="+c.available)' | tail -1) (limit in deploy/mongo/mongod.conf)"
say "primary host as seen by other members (must be an address a standby can reach, not a Docker alias): $(q 'print(rs.conf().members[0].host)' | tail -1)"
age() { local m; m=$(sudo -n stat -c %Y "$1" 2>/dev/null) || { echo "missing"; return; }; echo "$(( ($(date +%s) - m) / 60 )) min"; }
say "newest oplog slice state file written: $(age "$B/oplog.state") ago (the slice job runs every 10 min: more than 20 means PITR is behind)"
say "newest nightly dump: $(sudo -n sh -c "ls -t $B/*.gz 2>/dev/null | head -1" | sed 's#.*/##') ($(age "$(sudo -n sh -c "ls -t $B/*.gz 2>/dev/null | head -1")") ago)"
