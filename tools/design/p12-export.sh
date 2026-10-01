#!/usr/bin/env bash
# Export the Phase 12 commit series as an independent, cherry-pickable patch set.
#
# WHY
#
# Two sessions share this worktree: this one works Phase 12, another works the
# phases before it. They commit to the same branch, so a separate branch is not
# available — switching branches would change the working tree out from under the
# other session.
#
# What IS available is keeping the series independently reviewable. Every Phase 12
# commit is identifiable by its `[P12.` prefix, so the series can be exported as
# patches, handed to the reviewer on its own, cherry-picked elsewhere, or reverted
# without touching anyone else's work.
#
# It also reports the files Phase 12 and the other session are both likely to
# touch, because that is where a real conflict would come from.
#
# Usage: tools/design/p12-export.sh [output-dir]
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${1:-/tmp/p12-series}"
cd "$REPO"

mkdir -p "$OUT"

# Every commit this session authored, identifiable by the task prefix.
git log --format='%h|%s' | grep '\[P12\.' | sed 's/|.*//' > "$OUT/commits.txt"
COUNT=$(wc -l < "$OUT/commits.txt" | tr -d ' ')

if [ "$COUNT" -eq 0 ]; then
  echo "p12-export: no [P12.*] commits found." >&2
  exit 2
fi

: > "$OUT/series.patch"
while read -r c; do
  git format-patch -1 --stdout "$c" >> "$OUT/series.patch"
done < "$OUT/commits.txt"
sort -r "$OUT/commits.txt" > "$OUT/commits-reversed.txt"

# A commit of mine must never carry another session's work. This has been true
# for every commit so far and is cheap to keep true.
FOREIGN=$(while read -r c; do
  git show --name-only --format='' "$c" | grep -E '^(backend|deploy)/' || true
done < "$OUT/commits.txt" | sort -u)

# Files both sessions plausibly edit: design-system dependencies and tsconfig.
COLLIDE="admin/package.json admin/package-lock.json admin/tsconfig.json"
export COLLIDE

{
  echo "# Phase 12 — independent commit series"
  echo
  echo "Branch: $(git rev-parse --abbrev-ref HEAD)   commits: $COUNT"
  echo
  echo "These commits are on the shared branch, because the worktree is shared and a"
  echo "separate branch would disrupt the session working the earlier phases. They are"
  echo "exported here so Phase 12 can be reviewed on its own: the series is"
  echo "self-contained, ordered, and applies with \`git am --3way\` or cherry-pick."
  echo
  echo "## Commits, newest first"
  while read -r c; do printf -- '- `%s` %s\n' "$c" "$(git log -1 --format=%s "$c")"; done < "$OUT/commits.txt"
  echo
  echo "## Re-apply in order"
  echo '```'
  echo 'while read -r c; do git cherry-pick "$c"; done < commits-reversed.txt'
  echo '```'
  echo
  echo "## Collision surface"
  echo "Shared with the other session, and the only realistic conflict source:"
  for f in $COLLIDE; do
    if git log --format='%h %s' -- "$f" | grep -q '\[P12\.'; then
      echo "- \`$f\` — Phase 12 added design-system dependencies or path aliases here"
    fi
  done
  echo
  echo "## Foreign-file check"
  if [ -z "$FOREIGN" ]; then
    echo "Clean: no Phase 12 commit touches \`backend/\` or \`deploy/\`."
  else
    echo "REVIEW — these Phase 12 commits touch the other session's trees:"
    echo '```'
    echo "$FOREIGN"
    echo '```'
  fi
} > "$OUT/README.md"

echo "p12-export: $COUNT Phase 12 commit(s) -> $OUT"
[ -n "$FOREIGN" ] && echo "p12-export: WARNING — see the foreign-file check in README.md" || echo "p12-export: no foreign files in the series"
