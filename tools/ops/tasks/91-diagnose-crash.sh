#!/bin/bash
# READ-ONLY diagnosis of the backend crash loop "TypeError: cluster.on is not a function".
set +e
D=/opt/nabdah/deploy
DK="sudo -n docker"
mask() { sed -E 's#(://)[^:@/ ]+:[^@/ ]+@#\1***:***@#g; s#(SECRET|PASSWORD|TOKEN|KEY|PASS)([A-Z_]*)[=:] *[^ ]+#\1\2=***#g'; }
echo "## diagnose"
echo "deploy: backend $($DK inspect -f '{{.State.Status}} restarts={{.RestartCount}} health={{.State.Health.Status}}' nabdah-backend)"
echo "-- full stack of the latest crash (masked)"
$DK logs --tail 80 nabdah-backend 2>&1 | grep -v MONGOOSE | grep -v 'use at your own risk' | mask | tail -45 | cut -c1-260
echo "-- where cluster.on is used in the image"
$DK run --rm --entrypoint sh nabdah-prod-backend:latest -c "grep -rlE 'cluster\.on\(' dist 2>/dev/null | head; for f in \$(grep -rlE 'cluster\.on\(' dist 2>/dev/null | head -3); do echo \"== \$f\"; grep -nE 'cluster|process\.env' \$f | head -40 | cut -c1-220; done" 2>&1
echo "-- env names that look related"
sudo -n grep -oE '^[A-Z_][A-Z0-9_]*' $D/.env.production | grep -iE 'cluster|worker|instance|pm2|cpu|replica|concurr|sentinel|redis' | tr '\n' ' '; echo
echo "-- env files and dates"
sudo -n ls -la --time-style=+%F_%T $D/.env* /opt/nabdah/backups/env* 2>&1
for b in $(sudo -n ls $D/.env.production.* 2>/dev/null); do echo "names only in current vs $b:"; diff <(sudo -n grep -oE '^[A-Z_][A-Z0-9_]*=' $D/.env.production | sort) <(sudo -n grep -oE '^[A-Z_][A-Z0-9_]*=' $b | sort); done
echo "-- compose file date"; ls -la --time-style=+%F_%T $D/docker-compose*.yml
echo "## diagnose done"
