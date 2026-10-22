#!/bin/bash
# READ-ONLY (owner, 2026-10-22). Redis persistence check: the bgsave error policy and the last background save status.
# The password is read inside the container and never printed. The status: line reaches the public log (values only: ok/err, yes/no).
set +e
DK="sudo -n docker"
echo "## ops-redis"
ENVF=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}/.env.production
# The Redis password is passed to the container's redis-cli on stdin only (the container has no REDIS_PASSWORD in its
# environment; compose gives it to redis-server as an argument). It is never on a command line and never printed.
pw_cmd() { sudo -n grep -E '^REDIS_PASSWORD=' "$ENVF" 2>/dev/null | head -1 | cut -d= -f2- | sed -E "s/^\"(.*)\"$/\1/; s/^'(.*)'$/\1/"; }
rcli() { pw_cmd | $DK exec -i nabdah-redis sh -c 'read -r p; REDISCLI_AUTH="$p" redis-cli "$@"' sh "$@" 2>&1 | tr -d '\r'; }
if [ "$(rcli PING)" = PONG ]; then auth=ok; else auth=fail; fi
echo "status: redis auth=$auth"
rsv=unknown; swv=unknown
if [ "$auth" = ok ]; then
  rs=$(rcli INFO persistence | grep -E '^rdb_last_bgsave_status:' | cut -d: -f2)
  [ "$rs" = ok ] && rsv=ok; [ "$rs" = err ] && rsv=err
  sw=$(rcli CONFIG GET stop-writes-on-bgsave-error | sed -n 2p)
  [ "$sw" = yes ] && swv=yes; [ "$sw" = no ] && swv=no
fi
echo "status: redis rdb_last_bgsave_status=$rsv stop_writes=$swv"
echo "## ops-redis done"
