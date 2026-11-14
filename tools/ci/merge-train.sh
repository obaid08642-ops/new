#!/usr/bin/env bash
# Merge train: batch approved PRs into ONE branch so the full suite runs once per batch.
# Usage: tools/ci/merge-train.sh <train-number> <pr> [<pr> ...]
# Creates train/<n> from origin/main, merges each PR head in the given order (merge commits, no rebase),
# skips and lists any that conflict, pushes the branch, and writes the PR title/body to
# $TRAIN_OUT (default /tmp/train-<n>.md). Opening the PR is left to the caller (gh pr create or the API).
set -euo pipefail
n="${1:?train number}"; shift
[ "$#" -gt 0 ] || { echo "no PRs given" >&2; exit 2; }
out="${TRAIN_OUT:-/tmp/train-$n.md}"
git fetch -q origin main
git checkout -q -B "train/$n" origin/main
merged=(); skipped=(); rows=()
for pr in "$@"; do
  if ! git fetch -q origin "pull/$pr/head" 2>/dev/null; then skipped+=("#$pr (cannot fetch: closed or missing)"); continue; fi
  sha=$(git rev-parse FETCH_HEAD)
  if git merge --no-ff -q -m "train/$n: merge #$pr ($sha)" "$sha" >/dev/null 2>&1; then
    merged+=("$pr"); rows+=("| #$pr | \`$sha\` |")
  else
    files=$(git diff --name-only --diff-filter=U | head -5 | tr '\n' ' ')
    git merge --abort 2>/dev/null || git reset -q --hard HEAD
    skipped+=("#$pr (conflict: $files)")
  fi
done
[ "${#merged[@]}" -gt 0 ] || { echo "nothing merged" >&2; exit 1; }
title="Merge train $n:$(printf ' #%s' "${merged[@]}")"
{
  echo "$title"; echo
  echo "Batch branch \`train/$n\`: each PR head merged in order (no rebase). The full suite runs once on this PR, as on any PR."
  echo "When green, merge it; the included PRs become merged because their commits are on main. When red, split in two and retry."
  echo; echo "| PR | head SHA |"; echo "|---|---|"; printf '%s\n' "${rows[@]}"
  echo; echo "Skipped:"; if [ "${#skipped[@]}" -gt 0 ]; then printf -- '- %s\n' "${skipped[@]}"; else echo "- none"; fi
} > "$out"
git push -q -u origin "train/$n"
echo "pushed train/$n; body in $out"; cat "$out"
