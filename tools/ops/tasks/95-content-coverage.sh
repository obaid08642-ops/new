#!/bin/bash
# Content coverage (READ-ONLY, owner complaint 2026-10-26: sections of a product page in mixed languages).
# Runs `node dist/scripts/content-coverage.js` INSIDE the backend container (its own MONGO_URL / DB_NAME). It reads the published products
# and prints COUNTS only (never a text, a name or a document), as `status:` lines:
#   for each locale (ar en ur hi bn fil) and each content field (description indications dosage_instructions how_to_use warnings side_effects
#   storage_conditions package_content_details active_ingredient form package_size category sub_category):
#       has=<products with the field in that locale> only_other=<have it only in another language> missing=<have it nowhere>
#   and per locale the slug health: products, own_slug, root_slug_only, id_only (linked by the product id, which the route resolves), unresolvable (no slug and no id), duplicates.
# It also prints, by NAME only, which AI-provider variables are set in the container (GEMINI_API_KEY, OPENAI_API_KEY, ...), never a value.
set -u
CT=${CONTENT_CONTAINER:-nabdah-backend}
DK="sudo -n docker"
say() { echo "status: content-coverage: $*"; }
echo "## content-coverage"
STATE=$($DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CT" 2>/dev/null)
[ "$STATE" = healthy ] || { say "ABORT $CT is not healthy ($STATE)"; exit 1; }
$DK exec "$CT" test -f dist/scripts/content-coverage.js || { say "ABORT the running image has no content-coverage tool: deploy the release first"; exit 1; }

OUT=$($DK exec "$CT" node dist/scripts/content-coverage.js 2>&1); RC=$?
[ $RC -eq 0 ] || { say "ABORT tool failed (exit $RC): $(echo "$OUT" | tail -1 | cut -c1-200)"; exit 1; }
echo "$OUT" | sed -E 's/^\{"cmd":"content-coverage",/{/' | while IFS= read -r line; do
  case "$line" in
    '{"locale"'*) say "$(echo "$line" | sed -E 's/\{"locale":"([a-z]+)","field":"([a-z_]+)","has":([0-9]+),"only_other":([0-9]+),"missing":([0-9]+)\}/\1 \2 has=\3 only_other=\4 missing=\5/')" ;;
    '{"cmd":"slugs"'*) say "slugs $(echo "$line" | sed -E 's/\{"cmd":"slugs","locale":"([a-z]+)","products":([0-9]+),"own_slug":([0-9]+),"root_slug_only":([0-9]+),"id_only":([0-9]+),"unresolvable":([0-9]+),"duplicates":([0-9]+)\}/\1 products=\2 own_slug=\3 root_slug_only=\4 id_only=\5 unresolvable=\6 duplicates=\7/')" ;;
    *) say "$line" ;;
  esac
done

# AI provider: variable NAMES only, never a value
PRESENT=""
for v in GEMINI_API_KEY OPENAI_API_KEY GROQ_API_KEY CEREBRAS_API_KEY OPENROUTER_API_KEY DEEPSEEK_API_KEY QWEN_API_KEY AI_PROVIDER; do
  if $DK exec "$CT" sh -c "[ -n \"\${$v:-}\" ]"; then PRESENT="$PRESENT $v"; fi
done
say "ai provider variables set in the container:${PRESENT:- none}"
say "done (nothing was written)"
