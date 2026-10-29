#!/bin/bash
# Daily resume of the product-content translation (lead 2026-10-29: every provider uses up its day, the run stops at 400 of 1404). Installs a host cron that runs
# the SAME batch as 97-translate-content STEP=run once a day at 00:30 UTC (after the providers' daily reset), with the SAME hash guard, and logs COUNTS ONLY.
# OWNER APPROVAL FIRST: nothing is installed unless APPLY=yes below AND REQUESTS_SHA (>= 32 hex) is the hash 97 STEP=gaps printed for the requests file now on the host.
#   Run 1 (APPLY empty): DRY RUN. Prints whether the cron is installed, the requests file hash, whether REQUESTS_SHA matches it. Changes nothing.
#   Run 2 (APPLY=yes, REQUESTS_SHA=<hash>): writes the resume script $HELPER (root only; the hash is pinned inside) and the cron file $CRON_FILE.
#   ROLLBACK=yes: removes the cron file and the resume script. The answers file ($W/responses.jsonl) is never touched here.
# Each daily run: checks the pinned hash against $W/requests.jsonl (a changed file sends NOTHING), checks the backend is healthy, runs the tool with at most MAX_REQUESTS
# requests, copies the answers back to the host, and appends ONE line to the log: time, exit code, answers kept. No text, no key, no model output is written.
# Writing to the database stays with the guarded 90-catalogue-apply run (STEP=plan first), never with this cron.
set -u
APPLY=""
ROLLBACK=""
REQUESTS_SHA=""
MAX_REQUESTS=${MAX_REQUESTS:-600}
IN=${OPS_CATALOGUE_DIR:-/opt/nabdah/catalogue}
W=${OPS_TRANSLATE_DIR:-$IN/translate-work}
CRON_DIR=${OPS_CRON_DIR:-/etc/cron.d}
CRON_FILE=$CRON_DIR/nabd-translate-resume
HELPER=${OPS_RESUME_HELPER:-/opt/nabdah/translate-resume.sh}
LOG=${OPS_RESUME_LOG:-/var/log/nabd-translate-resume.log}
CT=${CATALOGUE_CONTAINER:-nabdah-backend}
DK="sudo -n docker"
CRON_LINE="30 0 * * * root $HELPER >> $LOG 2>&1"
echo "## translate-resume-cron"

say() { echo "status: translate-resume: $*"; }
case "$REQUESTS_SHA" in ''|*[!0-9a-f]*) PINNED_OK=0;; *) [ ${#REQUESTS_SHA} -ge 32 ] && PINNED_OK=1 || PINNED_OK=0;; esac

if [ "$ROLLBACK" = yes ]; then
  sudo -n rm -f "$CRON_FILE" "$HELPER"
  say "rolled back: cron file and resume script removed (answers untouched)"; exit 0
fi

CUR=""; sudo -n test -f "$W/requests.jsonl" && CUR=$(sudo -n sha256sum "$W/requests.jsonl" | cut -d' ' -f1)
INSTALLED=no; sudo -n test -f "$CRON_FILE" && INSTALLED=yes
ANS=0; sudo -n test -f "$W/responses.jsonl" && ANS=$(sudo -n wc -l < "$W/responses.jsonl")
say "cron installed: $INSTALLED; requests file: ${CUR:+present sha256=$CUR}${CUR:-missing}; answers kept: $ANS"
if [ -n "$CUR" ] && [ "$PINNED_OK" = 1 ]; then case "$CUR" in "$REQUESTS_SHA"*) say "REQUESTS_SHA matches the file on the host";; *) say "REQUESTS_SHA does NOT match the file on the host";; esac; fi

if [ "$APPLY" != yes ]; then
  say "dry run only: nothing was installed. To install (after the owner's Approve): APPLY=yes REQUESTS_SHA=${CUR:-<hash from 97 STEP=gaps>}"; exit 0
fi
[ "$PINNED_OK" = 1 ] || { say "ABORT REQUESTS_SHA must be at least 32 hex characters"; exit 1; }
[ -n "$CUR" ] || { say "ABORT no $W/requests.jsonl: run 97-translate-content STEP=gaps first"; exit 1; }
case "$CUR" in "$REQUESTS_SHA"*) ;; *) say "ABORT the requests changed (expected ${REQUESTS_SHA:0:12}, now ${CUR:0:12}): nothing installed"; exit 1;; esac

sudo -n mkdir -p "$(dirname "$HELPER")" || { say "ABORT cannot create the helper directory"; exit 1; }
sudo -n tee "$HELPER" >/dev/null <<HELP || { say "ABORT cannot write $HELPER"; exit 1; }
#!/bin/bash
# written by tools/ops/tasks/99-translate-resume-cron.sh: counts-only daily resume of the translation batch (pinned hash)
set -u
W="$W"; CT="$CT"; PIN="$REQUESTS_SHA"; MAX="$MAX_REQUESTS"; CW=/tmp/translate-work-cron
DK="sudo -n docker"
log() { echo "\$(date -u +%FT%TZ) translate-resume: \$*"; }
[ "\$(\$DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "\$CT" 2>/dev/null)" = healthy ] || { log "skipped: backend not healthy"; exit 0; }
SHA=\$(sha256sum "\$W/requests.jsonl" 2>/dev/null | cut -d' ' -f1)
case "\$SHA" in "\$PIN"*) ;; *) log "skipped: the requests file changed, nothing sent"; exit 0;; esac
\$DK exec "\$CT" sh -c "rm -rf \$CW && mkdir -p \$CW" || { log "skipped: no work directory"; exit 0; }
cat "\$W/requests.jsonl" | \$DK exec -i "\$CT" sh -c "cat > \$CW/requests.jsonl" || { log "skipped: cannot copy the requests in"; exit 0; }
if [ -f "\$W/responses.jsonl" ]; then cat "\$W/responses.jsonl" | \$DK exec -i "\$CT" sh -c "cat > \$CW/responses.jsonl"; else \$DK exec "\$CT" sh -c ": > \$CW/responses.jsonl"; fi
\$DK exec "\$CT" node dist/scripts/translate-product-content.js run --requests="\$CW/requests.jsonl" --out="\$CW/responses.jsonl" --max="\$MAX" >/dev/null 2>&1; RC=\$?
\$DK exec "\$CT" cat "\$CW/responses.jsonl" 2>/dev/null > "\$W/responses.jsonl.new" && mv "\$W/responses.jsonl.new" "\$W/responses.jsonl" && chmod 600 "\$W/responses.jsonl"
\$DK exec "\$CT" cat "\$CW/stats.json" 2>/dev/null > "\$W/stats.json.new" && mv "\$W/stats.json.new" "\$W/stats.json" && chmod 600 "\$W/stats.json"
\$DK exec "\$CT" rm -rf "\$CW" >/dev/null 2>&1
log "exit=\$RC answers=\$(wc -l < "\$W/responses.jsonl")"
HELP
sudo -n chmod 750 "$HELPER" && sudo -n chown root:root "$HELPER" 2>/dev/null
printf '# daily resume of the product-content translation after the providers reset (tools/ops/tasks/99-translate-resume-cron.sh)\n%s\n' "$CRON_LINE" | sudo -n tee "$CRON_FILE" >/dev/null \
  && sudo -n chmod 644 "$CRON_FILE" || { sudo -n rm -f "$HELPER" "$CRON_FILE"; say "ABORT cannot write the cron file; the resume script was removed"; exit 1; }
say "installed: $CRON_FILE (daily 00:30 UTC) -> $HELPER, pinned ${REQUESTS_SHA:0:12}, at most $MAX_REQUESTS requests per run"
exit 0
