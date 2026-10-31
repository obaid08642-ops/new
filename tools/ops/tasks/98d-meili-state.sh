#!/bin/bash
# Why does Meilisearch need more than 640 MB, and is it in a restart loop? READ-ONLY by default, `status:` lines only; never prints MEILI_MASTER_KEY (the key is read INSIDE nabdah-backend,
# which already has MEILI_URL and MEILI_MASTER_KEY). Reports: container restarts/limit/OOM flag, MEILI_MAX_INDEXING_* by name+value (not secret), the data volume size, database size vs used size,
# the index documents and isIndexing, the task counts by status and the 5 oldest enqueued/processing tasks (type + age), how many documents the Mongo search_index holds, and how many times
# the worker logged the boot sync in the last 24 h.
# Guarded writes (dry run by default, nothing happens without APPLY=yes):
#   CANCEL=yes APPLY=yes  cancel every enqueued/processing task (stops a resumed indexing run that is killing the container); the documents already stored stay.
#   CLEAN_TASKS=yes APPLY=yes  delete the FINISHED task history (DELETE /tasks?statuses=succeeded,failed,canceled): after a restart loop the task history (not the documents) is most of the
#                         database file. The dry run prints how many finished tasks would go. NOTE: Meilisearch (LMDB) reuses the freed pages but never returns them to the disk, so the file
#                         stays as large (db size does not fall); only a dump-and-import, or an empty data directory re-filled from Mongo (the search index is a mirror), makes it smaller.
#   RESET=yes  APPLY=yes  delete the index nabd_search so the paced boot sync (PR #2261) re-sends it from Mongo. Refused unless search_index in Mongo holds documents (never empty the search
#                         with nothing to rebuild it from). The index is a mirror of Mongo, so this loses no data; search is incomplete until the worker has re-sent it.
set -u
APPLY=${APPLY:-no}; CANCEL=${CANCEL:-no}; RESET=${RESET:-no}; CLEAN_TASKS=${CLEAN_TASKS:-no}
DK="sudo -n docker"
IDX=nabd_search
echo "## meili-state"
say() { echo "status: meili-state: $*"; }

say "container: state=$($DK inspect -f '{{.State.Status}}' nabdah-meilisearch 2>/dev/null) restarts=$($DK inspect -f '{{.RestartCount}}' nabdah-meilisearch 2>/dev/null) oom_killed=$($DK inspect -f '{{.State.OOMKilled}}' nabdah-meilisearch 2>/dev/null) limit_bytes=$($DK inspect -f '{{.HostConfig.Memory}}' nabdah-meilisearch 2>/dev/null) swap_limit_bytes=$($DK inspect -f '{{.HostConfig.MemorySwap}}' nabdah-meilisearch 2>/dev/null)"
say "indexing settings: $($DK inspect -f '{{range .Config.Env}}{{println .}}{{end}}' nabdah-meilisearch 2>/dev/null | grep -E '^MEILI_MAX_INDEXING_(MEMORY|THREADS)=' | tr '\n' ' ')"
say "memory now: $($DK stats --no-stream --format '{{.MemUsage}}' nabdah-meilisearch 2>/dev/null)"
VOL=$($DK inspect -f '{{range .Mounts}}{{if eq .Destination "/meili_data"}}{{.Source}}{{end}}{{end}}' nabdah-meilisearch 2>/dev/null)
say "data volume: ${VOL:-unknown} size=$([ -n "$VOL" ] && sudo -n du -sh "$VOL" 2>/dev/null | cut -f1)"

# Runs inside the backend container; talks to Meilisearch with the key from its own environment and prints counts only.
JS='const u=process.env.MEILI_URL,k=process.env.MEILI_MASTER_KEY;const a=process.argv[1]||"state";const h={Authorization:"Bearer "+k};
const f=async(m,p)=>{const r=await fetch(u+p,{method:m,headers:h});const t=await r.text();let j;try{j=JSON.parse(t)}catch(e){j={}};return {s:r.status,j}};
(async()=>{
 if(a==="cancel"){const r=await f("POST","/tasks/cancel?statuses=enqueued,processing");console.log("cancel http="+r.s+" task="+(r.j.taskUid??"-"));return}
 if(a==="clean"){const r=await f("DELETE","/tasks?statuses=succeeded,failed,canceled");console.log("clean http="+r.s+" task="+(r.j.taskUid??"-"));return}
 if(a==="reset"){const r=await f("DELETE","/indexes/'$IDX'");console.log("reset http="+r.s+" task="+(r.j.taskUid??"-"));return}
 const st=await f("GET","/stats");const ix=await f("GET","/indexes/'$IDX'/stats");
 const mbf=(v)=>v===undefined||v===null?"n/a":Math.round(v/1048576)+"MB";
 console.log("db size="+mbf(st.j.databaseSize)+" used="+mbf(st.j.usedDatabaseSize)+" (stats keys: "+Object.keys(st.j).filter(k=>k!=="indexes").join(",")+")");
 console.log("index http="+ix.s+" documents="+(ix.j.numberOfDocuments??"-")+" isIndexing="+(ix.j.isIndexing??"-"));
 for(const s of ["enqueued","processing","succeeded","failed","canceled"]){const r=await f("GET","/tasks?statuses="+s+"&limit=1");console.log("tasks "+s+"="+(r.j.total??"?"))}
 const o=await f("GET","/tasks?statuses=enqueued,processing&limit=5&reverse=true");
 for(const t of (o.j.results||[]))console.log("open task type="+t.type+" status="+t.status+" age_min="+Math.round((Date.now()-new Date(t.enqueuedAt).getTime())/60000));
})().catch(e=>console.log("error "+String(e.message).slice(0,80)))'
meili() { $DK exec nabdah-backend node -e "$JS" "$1" 2>/dev/null | tr -d '\r'; }
OUT=$(meili state)
if [ -z "$OUT" ]; then say "meilisearch unreadable from nabdah-backend (container down, or key/URL not set)"; else echo "$OUT" | while read -r l; do say "$l"; done; fi

MQ="print(db.getSiblingDB(process.env.DB_NAME||'nabd_nestjs').search_index.countDocuments({}))"
WANTED=$($DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$MQ" 2>/dev/null | tail -1 | tr -d '\r')
case "$WANTED" in ''|*[!0-9]*) WANTED=unreadable;; esac
say "mongo search_index documents: $WANTED"
say "worker: restarts=$($DK inspect -f '{{.RestartCount}}' nabdah-worker 2>/dev/null); boot sync log lines in the last 24 h: $($DK logs --since 24h nabdah-worker 2>&1 | grep -ciE 'meilisearch (sync|already holds|holds)') (the sync lines exist only from PR #2261 on; before it the boot re-send logged nothing, so 0 is expected on the old release)"

if [ "$CANCEL" = yes ]; then
  if [ "$APPLY" = yes ]; then say "CANCEL: $(meili cancel)"; else say "dry run: would cancel every enqueued/processing task (APPLY=yes to do it)"; fi
fi
if [ "$CLEAN_TASKS" = yes ]; then
  if [ "$APPLY" = yes ]; then say "CLEAN_TASKS: $(meili clean); the file on disk does not shrink (see the header): dump-and-import or an empty data directory re-filled from Mongo does"
  else say "dry run: would delete every finished task (succeeded + failed + canceled, counts above); the disk file would not shrink (APPLY=yes to do it)"; fi
fi
if [ "$RESET" = yes ]; then
  if [ "$WANTED" = unreadable ] || [ "$WANTED" = 0 ]; then say "RESET refused: the Mongo search_index holds $WANTED documents, nothing to rebuild from"
  elif [ "$APPLY" = yes ]; then say "RESET: $(meili reset); the worker re-sends $WANTED documents at its next boot (restart nabdah-worker to start it now)"
  else say "dry run: would delete index $IDX; the paced boot sync re-sends $WANTED documents from Mongo (APPLY=yes to do it)"; fi
fi
say "done$([ "$APPLY" = yes ] && echo '' || echo ' (read-only / dry run)')"
