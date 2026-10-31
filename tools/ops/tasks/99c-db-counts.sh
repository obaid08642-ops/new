#!/bin/bash
# READ-ONLY: run 74's pre-deploy dump was 3.5 MB (runs 59-68: about 354 MB). Are the data there? Prints database names with sizes,
# and per collection of the app database: document count and storage size. Names and numbers only, never a value.
set -u
DK="sudo -n docker"; CT=nabdah-mongodb
q() { $DK exec $CT sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null; }
# mongosh --eval prints a returned string in QUOTES (like 'nabd_nestjs'); the app-database query below then built getSiblingDB(''nabd_nestjs'') and printed nothing (run 75). print() writes the raw text.
echo "status: db-counts: databases: $(q 'print(db.adminCommand({listDatabases:1}).databases.map(d=>d.name+"="+Math.round(d.sizeOnDisk/1048576)+"MB").join(" "))')"
APPDB=$(q 'print(db.adminCommand({listDatabases:1}).databases.filter(d=>!["admin","local","config"].includes(d.name)).sort((a,b)=>b.sizeOnDisk-a.sizeOnDisk).map(d=>d.name)[0])' | tail -1 | tr -d "'\" ")
echo "status: db-counts: largest app database: $APPDB"
q "const d=db.getSiblingDB('$APPDB'); print(d.getCollectionNames().sort().map(c=>{const s=d.getCollection(c).stats(); return c+'='+s.count+' ('+Math.round(s.storageSize/1048576)+'MB)'}).join('\n'))" | head -200 | sed 's/^/status: db-counts:   /'
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
echo "status: db-counts: newest dumps (name, bytes):"
sudo -n sh -c "ls -lt $B/*.gz 2>/dev/null | head -8" | awk '{print "status: db-counts:   "$9" "$5}'
