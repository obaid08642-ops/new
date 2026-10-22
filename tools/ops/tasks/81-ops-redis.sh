#!/bin/bash
# READ-ONLY (owner, 2026-10-22). Redis persistence check: the bgsave error policy and the last background save status.
# The password is read inside the container and never printed. The status: line reaches the public log (values only: ok/err, yes/no).
set +e
DK="sudo -n docker"
echo "## ops-redis"
rcli() { $DK exec nabdah-redis sh -c 'REDISCLI_AUTH="${REDIS_PASSWORD:-${REDIS_PASS:-}}" redis-cli "$@"' sh "$@" 2>&1; }
rs=$(rcli INFO persistence | grep -E '^rdb_last_bgsave_status:' | cut -d: -f2 | tr -d '\r')
[ "$rs" = ok ] && rsv=ok || rsv=err
sw=$(rcli CONFIG GET stop-writes-on-bgsave-error | sed -n 2p | tr -d '\r')
[ "$sw" = yes ] && swv=yes || swv=no
echo "status: redis rdb_last_bgsave_status=$rsv stop_writes=$swv"
echo "## ops-redis done"
