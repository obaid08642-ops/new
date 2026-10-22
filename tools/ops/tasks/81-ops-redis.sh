#!/bin/bash
# READ-ONLY (owner, 2026-10-22). Redis persistence check: the bgsave error policy and the last background save status.
# The password is read inside the container and never printed. Lines start with "redis:" (encrypted report).
set +e
DK="sudo -n docker"
echo "## ops-redis"
rcli() { $DK exec nabdah-redis sh -c 'REDISCLI_AUTH="${REDIS_PASSWORD:-${REDIS_PASS:-}}" redis-cli "$@"' sh "$@" 2>&1; }
echo "redis: $(rcli CONFIG GET stop-writes-on-bgsave-error | tr '\n' ' ')"
rcli INFO persistence | grep -E '^(rdb_last_bgsave_status|aof_last_bgsave_status|rdb_last_bgsave_time_sec|rdb_changes_since_last_save|loading):' | sed 's/^/redis: /'
echo "## ops-redis done"
