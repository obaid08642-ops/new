#!/usr/bin/env bash
set -u
cd "$(git rev-parse --show-toplevel)"
manifest='audit-artifacts/phase0b-backend/NABD_Phase0B_Backend_Semantic_Read_Manifest_2026-08-24.tsv'
missing=0
while IFS=$'\t' read -r archive member sha phase match lines kind role domain read evidence rest; do
  [[ "$member" == "member_path" ]] && continue
  [[ "$read" == "YES" ]] || continue
  if [[ ! -f "$evidence" ]]; then
    printf 'MISSING_EVIDENCE\t%s\t%s\n' "$member" "$evidence"
    missing=$((missing+1))
  fi
done < "$manifest"
printf 'MISSING_EVIDENCE_COUNT=%s\n' "$missing"
printf 'DIFF_CHECK_BEGIN\n'
git diff --check origin/main..HEAD
check_status=$?
printf 'DIFF_CHECK_EXIT=%s\n' "$check_status"
printf 'DIFF_CHECK_END\n'
printf 'STATUS_BEGIN\n'
git status --short
status_output=$(git status --short)
printf 'STATUS_END\n'
printf 'SUMMARY_MISSING_EVIDENCE=%s\n' "$missing"
printf 'SUMMARY_DIFF_CHECK_EXIT=%s\n' "$check_status"
if [[ -n "$status_output" ]]; then
  printf 'SUMMARY_STATUS_CLEAN=NO\n'
else
  printf 'SUMMARY_STATUS_CLEAN=YES\n'
fi
# The caller decides whether diff-check whitespace is an explicit evidence exception.
exit 0
