# Sourced, not run. Refuses a dump that is far smaller than the dumps before it (2026-10-31, run 74: the pre-deploy dump was 3.5 MB where runs 59-68 wrote ~354 MB, and the
# deploy accepted it because its only checks were "non-empty" and "at least half of the last nightly", and the nightly glob `nabd_*.gz` does not match the encrypted `.gz.gpg` dumps).
#   dump_guard <new_file> <dir> <glob>...   -> 0 when the new dump is at least DUMP_GUARD_MIN_PERCENT (default 50) of the BASELINE; 1 otherwise (it prints why)
# BASELINE = the largest of the 3 newest earlier dumps matching the globs (not the newest one: one bad dump must not lower the bar for the next). Files ending in .suspect are ignored.
# DUMP_GUARD_SUDO (e.g. "sudo -n") prefixes stat and ls when the backup directory is not readable by the caller (the ops deploy task). With no earlier dump there is nothing to compare: it passes
# and says so, unless DUMP_GUARD_REQUIRE_BASELINE=1 (then it fails: an unreadable directory must not look like a first dump). DUMP_GUARD_FORCE=1 accepts a smaller dump on purpose (a deliberate, approved shrink) and says it did.
dump_guard() {
  local new=$1 dir=$2; shift 2
  local pct=${DUMP_GUARD_MIN_PERCENT:-50} sz base=0 n=0 f g s
  sz=$(${DUMP_GUARD_SUDO:-} stat -c %s "$new" 2>/dev/null || echo 0)
  while IFS= read -r f; do
    [ -n "$f" ] && [ "$f" != "$new" ] || continue
    case "$f" in *.suspect|*.oplogts) continue;; esac
    s=$(${DUMP_GUARD_SUDO:-} stat -c %s "$f" 2>/dev/null || echo 0)
    [ "$s" -gt 0 ] || continue
    n=$((n+1)); [ "$n" -le 3 ] || break
    [ "$s" -gt "$base" ] && base=$s
  done < <(for g in "$@"; do ${DUMP_GUARD_SUDO:-} sh -c 'ls -1t "$0"/$1 2>/dev/null' "$dir" "$g"; done | xargs -r ${DUMP_GUARD_SUDO:-} ls -1t 2>/dev/null)
  if [ "$base" -eq 0 ]; then
    if [ -n "${DUMP_GUARD_REQUIRE_BASELINE:-}" ]; then echo "status: dump-guard: ABORT: no earlier dump could be read to compare with (new dump $sz bytes): nothing was changed"; return 1; fi
    echo "status: dump-guard: no earlier dump to compare with: new dump $sz bytes accepted"; return 0
  fi
  if [ $((sz * 100)) -ge $((base * pct)) ]; then echo "status: dump-guard: ok: new dump $sz bytes is at least ${pct}% of the baseline $base bytes (largest of the last $n dumps)"; return 0; fi
  if [ -n "${DUMP_GUARD_FORCE:-}" ]; then echo "status: dump-guard: FORCED: new dump $sz bytes is under ${pct}% of the baseline $base bytes and DUMP_GUARD_FORCE is set"; return 0; fi
  echo "status: dump-guard: ABORT: new dump $sz bytes is under ${pct}% of the baseline $base bytes (largest of the last $n dumps): nothing was changed, the earlier dumps are kept"
  return 1
}
