#!/bin/bash
# usage: autoloop.sh : every 4 min, merge each PR in approved.txt whose latest checks are all green (lighthouse aside)
R=obaid08642-ops/new; W=${LEAD_DIR:-$(cd "$(dirname "$0")" && pwd)}
declare -A reported
for _once in 1; do
  for N in $(tr " " "\n" < $W/approved.txt | sort -u); do
    st=$(gh api repos/$R/pulls/$N --jq '.state+" "+.head.sha' 2>/dev/null) || continue
    set -- $st; [ "$1" != "open" ] && continue; sha=$2
    out=$(gh api "repos/$R/commits/$sha/check-runs?per_page=100" --jq '{total:.total_count, runs:[.check_runs|group_by(.name)[]|max_by(.id)|select(.name!="lighthouse")]} | {total, pending:([.runs[]|select(.status!="completed")]|length), bad:([.runs[]|select(.status=="completed" and (.conclusion|IN("success","skipped","neutral")|not))]|map(.name))}' 2>/dev/null) || continue
    read -r total pend bad < <(echo "$out" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['total'],d['pending'],len(d['bad']))" 2>/dev/null) || continue
    if [ "$bad" != "0" ]; then key="$N:$sha"; [ -z "${reported[$key]}" ] && { echo "$(date -u +%T) #$N FAILED $out"; reported[$key]=1; }; continue; fi
    if [ "$pend" = "0" ] && [ "$total" -ge 10 ]; then
      msg=$(gh api -X PUT repos/$R/pulls/$N/merge -f merge_method=merge --jq .message 2>&1)
      key="m$N:$sha:$msg"; [ -z "${reported[$key]}" ] && { echo "$(date -u +%T) #$N $msg"; reported[$key]=1; }
    fi
  done

done
