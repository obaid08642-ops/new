#!/bin/bash
# Pharmacy ordering after #2028 ("Most ordered") and #2032 ("All" = a mix of every category): fills the two fields they read, once, right
# after the release is deployed. Two runs of the same task:
#   Run 1 (APPLY empty): DRY RUN. Reads only. Prints, as `status:` lines, how many products have delivered orders and how many of those
#                        counts differ from `orders_count`, how many products still lack `category_pos`, and how many distinct top-level
#                        categories the first 24 products of "All" hold now.
#   Run 2 (APPLY=yes, set in this file by the reviewer after reading run 1): APPLY.
# The apply runs `node dist/scripts/ranking-recompute.js apply` INSIDE the backend container (its own MONGO_URL / DB_NAME / REDIS_URL, no admin
# token on the wire): the delivered-orders recount (orders_count), then ProductRankingService.recomputeAll(), the very code behind
# POST /admin/ranking/recompute and the 30-minute score job (scores, then category_pos), then a check that every product with a category has its
# position, and the first 24 of "All" counted again. Prints counts only, never a document, a name or a value of the environment.
# Idempotent: a second apply writes the same numbers. Safe to run while the shop is open (the same work the timer does every 30 minutes).
set -u
APPLY=""
CT=${RANKING_CONTAINER:-nabdah-backend}
DK="sudo -n docker"
TOOL="node dist/scripts/ranking-recompute.js"
echo "## ranking-recompute"

say() { echo "status: ranking-recompute: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
# the value of a top-level JSON key (numbers and booleans only) from one line of the tool's output
jval() { sed -n "s/.*\"$1\":\([^,}]*\).*/\1/p" | head -1 | tr -d '"'; }

# --- 0. pre-checks
STATE=$(health "$CT")
[ "$STATE" = healthy ] || { say "ABORT $CT is not healthy ($STATE)"; exit 1; }
$DK exec "$CT" test -f dist/scripts/ranking-recompute.js || { say "ABORT the running image has no ranking-recompute tool: deploy the release first"; exit 1; }

# --- 1. plan (read-only)
PLAN=$($DK exec "$CT" $TOOL plan 2>&1); RC=$?
[ $RC -eq 0 ] || { say "ABORT plan failed (exit $RC): $(echo "$PLAN" | tail -1 | cut -c1-200)"; exit 1; }
echo "$PLAN" | sed 's/^/status: ranking-recompute: plan /' | cut -c1-300
BEFORE=$(echo "$PLAN" | grep '"step":"first_page"' | jval distinct_categories)
if [ "$APPLY" != yes ]; then
  say "dry run only: nothing was written. The first 24 of All hold ${BEFORE:-?} distinct categories now. To apply, set APPLY=yes in this task"
  exit 0
fi

# --- 2. apply and verify (the tool exits 1 when a product with a category is left without its position)
OUT=$($DK exec "$CT" $TOOL apply 2>&1); RC=$?
echo "$OUT" | sed 's/^/status: ranking-recompute: apply /' | cut -c1-300
if [ $RC -ne 0 ]; then
  say "FAILED (exit $RC): $(echo "$OUT" | tail -1 | cut -c1-200). Nothing to roll back: the fields are recomputed values; run again once the cause is fixed"
  exit 1
fi
AFTER=$(echo "$OUT" | grep '"when":"after"' | jval distinct_categories)
OF=$(echo "$OUT" | grep '"when":"after"' | jval of)
say "applied and verified: the first ${OF:-?} of All hold ${AFTER:-?} distinct top-level categories (before: ${BEFORE:-?})"
