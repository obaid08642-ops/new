#!/bin/bash
# Pause a detached 98-translate-content run WITHOUT losing its answers (owner, 2026-10-27: the deploy must not wait ~24 h for the
# free-tier batch). Copies the answers the container holds to the host FIRST, then stops the run. A later STEP=run resumes: it copies
# the host answers back in and sends only the requests that have no answer yet. Sends nothing to a model; writes only the host copy.
set -u
CT=${CATALOGUE_CONTAINER:-nabdah-backend}
IN=${OPS_CATALOGUE_DIR:-/opt/nabdah/catalogue}
W=${OPS_TRANSLATE_DIR:-$IN/translate-work}
DK="sudo -n docker"
say() { echo "status: translate-pause: $*"; }
CW=/tmp/translate-work
n_c=$($DK exec "$CT" sh -c "wc -l < $CW/responses.jsonl" 2>/dev/null || echo 0)
n_h=$(sudo -n sh -c "wc -l < '$W/responses.jsonl'" 2>/dev/null || echo 0)
say "before: container answers=$n_c host answers=$n_h"
# keep whichever copy is larger (the container's grows while the run is going; the host's is the last saved one)
if [ "${n_c:-0}" -gt "${n_h:-0}" ] 2>/dev/null; then
  sudo -n cp "$W/responses.jsonl" "$W/responses.before-pause.jsonl" 2>/dev/null || true
  $DK exec "$CT" cat "$CW/responses.jsonl" | sudo -n tee "$W/responses.jsonl.tmp" >/dev/null \
    && sudo -n mv "$W/responses.jsonl.tmp" "$W/responses.jsonl" && sudo -n chmod 600 "$W/responses.jsonl" \
    || { say "ABORT could not copy the answers to the host: the run was NOT stopped"; exit 1; }
fi
saved=$(sudo -n sh -c "wc -l < '$W/responses.jsonl'" 2>/dev/null || echo 0)
say "answers saved on the host: $saved"
# stop the tool inside the container and the detached wrapper on the host
$DK exec "$CT" sh -c "pkill -f 'translate-product-content' || true" >/dev/null 2>&1
pkill -f 'ops-98-translate-content.sh' >/dev/null 2>&1 || true
sleep 2
if $DK exec "$CT" sh -c "pgrep -f translate-product-content" >/dev/null 2>&1; then say "WARN the tool is still running"; else say "run stopped; resume later with STEP=run (only unanswered requests are sent)"; fi
exit 0
