#!/bin/bash
# READ-ONLY (build session, 2026-10-16, issue #1603). Two questions the outage left open:
#   1. WHY DID THE DISK ALERT NOT PREVENT IT? (#1446 added mail alerts at < 20 % free.) Reads the monitor's own evidence:
#      is monitor.sh scheduled and running, which version is installed, what it logged between 2026-10-15 and now (first
#      and last disk alert, the free % at those times), whether it could mail (OPS_ALERT_EMAIL, RESEND_API_KEY, MAIL_FROM
#      set: yes/no only), what its mail state says (last-sent, last-signature), whether a mail failed, and what the
#      installed monitor.sh would send right now (a dry run: MONITOR_MAIL_CMD=cat, throw-away state dir, nothing is sent).
#   2. WHAT DID COTURN WRITE (935 MB)? Per container: the writable layer (docker inspect --size), the log driver and its
#      caps, the json log file size and, for coturn, `docker diff` (paths that changed) and its largest directories.
#      A container created before the compose logging section existed has NO log rotation: its json log grows for ever.
# Prints names, sizes, paths, timestamps and yes/no; never file contents beyond monitor log lines (which carry numbers
# only), never a secret value. Public lines start with "cleanup: diskwatch:".
set +e
DK="sudo -n docker"
gb() { awk '{printf "%.2f GB", $1/1073741824}'; }
mb() { awk '{printf "%.1f MB", $1/1048576}'; }
P() { echo "cleanup: diskwatch: $*"; }

P "now $(date -u +%FT%TZ); / $(df -Ph / | awk 'NR==2{print "size "$2", used "$3", free "$4" ("$5" used)"}')"

echo "## 1. the alert"
P "monitor.sh installed: $(sudo -n sh -c 'ls -l /opt/nabdah/deploy/scripts/monitor.sh' 2>&1 | awk '{print $5" bytes, "$6" "$7" "$8}') sha256 $(sudo -n sha256sum /opt/nabdah/deploy/scripts/monitor.sh 2>/dev/null | cut -c1-12)"
P "monitor.sh has the mail code: $(sudo -n grep -c 'send_mail' /opt/nabdah/deploy/scripts/monitor.sh) send_mail lines; threshold line: $(sudo -n grep -m1 -o 'DISK_MIN_FREE_PCT:-[0-9]*' /opt/nabdah/deploy/scripts/monitor.sh)"
for src in /etc/cron.d/nabd-monitor /etc/cron.d/nabd-backups; do
  sudo -n test -f $src && P "$src: $(sudo -n grep -v '^\s*#' $src | grep -c monitor.sh) monitor.sh line(s): $(sudo -n grep monitor.sh $src | grep -v '^\s*#' | head -2 | tr '\n' ';')"
done
for who in root "$(id -un)"; do
  if [ "$who" = root ]; then CT="sudo -n crontab"; else CT="crontab"; fi
  P "crontab of $who: $($CT -l 2>/dev/null | grep -v '^\s*#' | grep -c monitor.sh) monitor.sh line(s)"
done
P "cron service: $(systemctl is-active cron 2>/dev/null || systemctl is-active crond 2>/dev/null)"
P "cron runs of monitor.sh since 2026-10-15: $(sudo -n journalctl --since '2026-10-15' --no-pager 2>/dev/null | grep -c 'monitor.sh')"
for f in /var/log/nabdah-monitor.log /var/log/nabdah-alerts.log; do
  sudo -n test -f $f && P "$f: $(sudo -n wc -l < $f) lines, modified $(sudo -n stat -c %y $f | cut -c1-19)" || P "$f: MISSING"
done
echo "-- monitor log: first and last line, every line since 2026-10-15 that mentions the disk or an error (numbers only)"
sudo -n head -1 /var/log/nabdah-monitor.log 2>/dev/null
sudo -n tail -1 /var/log/nabdah-monitor.log 2>/dev/null
sudo -n grep -E '^\[2026-10-1[56]' /var/log/nabdah-monitor.log 2>/dev/null | grep -iE 'disk|alert' | awk 'NR==1 || NR%8==0' | cut -c1-260 | tail -40
P "monitor runs logged on 2026-10-15: $(sudo -n grep -c '^\[2026-10-15' /var/log/nabdah-monitor.log 2>/dev/null); on 2026-10-16: $(sudo -n grep -c '^\[2026-10-16' /var/log/nabdah-monitor.log 2>/dev/null)"
FIRST=$(sudo -n grep -m1 -E '^\[2026-10-1[56].*(ALERT|alerts).*disk' /var/log/nabdah-monitor.log 2>/dev/null | cut -c2-20)
P "first disk alert in the monitor log since 2026-10-15: ${FIRST:-none}"
sudo -n grep -E '^\[2026-10-1[56]' /var/log/nabdah-alerts.log 2>/dev/null | grep -iE 'disk|mail' | cut -c1-200 | awk 'NR<=6 || /mail/' | tail -30
P "alert mails not sent or failed since 2026-10-15: $(sudo -n grep -E '^\[2026-10-1[56]' /var/log/nabdah-alerts.log 2>/dev/null | grep -ciE 'mail not sent|mail failed')"
for n in OPS_ALERT_EMAIL RESEND_API_KEY MAIL_FROM DISK_MIN_FREE_PCT ALERT_REPEAT_HOURS; do
  P "env $n: $(sudo -n grep -qE "^$n=.+" /opt/nabdah/deploy/.env.production && echo set || echo NOT SET)"
done
for f in last-signature last-sent; do
  sudo -n test -e /var/lib/nabdah-monitor/$f && P "mail state $f: modified $(sudo -n stat -c %y /var/lib/nabdah-monitor/$f | cut -c1-19), $(sudo -n wc -c < /var/lib/nabdah-monitor/$f) bytes" || P "mail state $f: none (no alert mail was ever sent from this state dir)"
done
echo "-- dry run of the installed monitor.sh (mail goes to stdout, state in a throw-away dir, nothing is sent)"
TD=$(mktemp -d)
sudo -n env MONITOR_STATE_DIR=$TD MONITOR_LOG_DIR=$TD MONITOR_MAIL_CMD=cat OPS_ALERT_EMAIL=dry-run@invalid bash /opt/nabdah/deploy/scripts/monitor.sh 2>&1 | head -30 | cut -c1-240
sudo -n tail -3 $TD/nabdah-monitor.log 2>/dev/null | cut -c1-240
sudo -n rm -rf $TD

echo "## 2. containers: writable layer, log driver, log caps, log file"
for c in $($DK ps -aq); do
  $DK inspect --size -f '{{.Name}}|{{.SizeRw}}|{{.HostConfig.LogConfig.Type}}|{{index .HostConfig.LogConfig.Config "max-size"}}|{{index .HostConfig.LogConfig.Config "max-file"}}|{{.LogPath}}|{{.Created}}|{{.RestartCount}}' $c 2>/dev/null
done | while IFS='|' read name rw type msize mfile lp created rc; do
  lsz=$(sudo -n sh -c "ls -l ${lp}* 2>/dev/null | awk '{s+=\$5} END{print s+0}'")
  P "$(echo $name | tr -d /): layer $(echo ${rw:-0} | mb); log driver $type max-size=${msize:-NONE} max-file=${mfile:-NONE}; log files $(echo ${lsz:-0} | mb); created ${created:0:16}; restarts $rc"
done
P "docker root: $(sudo -n du -sx /var/lib/docker 2>/dev/null | awk '{printf "%.2f GB", $1/1048576}'); containers dir $(sudo -n du -sx /var/lib/docker/containers 2>/dev/null | awk '{printf "%.2f GB", $1/1048576}'); overlay2 $(sudo -n du -sx /var/lib/docker/overlay2 2>/dev/null | awk '{printf "%.2f GB", $1/1048576}'); volumes $(sudo -n du -sx /var/lib/docker/volumes 2>/dev/null | awk '{printf "%.2f GB", $1/1048576}')"

echo "## 3. coturn"
P "coturn config: log-file line: $(sudo -n grep -m1 '^log-file' /opt/nabdah/deploy/coturn/turnserver.rendered.conf 2>/dev/null); verbose: $(sudo -n grep -c '^verbose' /opt/nabdah/deploy/coturn/turnserver.rendered.conf 2>/dev/null); simple-log: $(sudo -n grep -c '^simple-log' /opt/nabdah/deploy/coturn/turnserver.rendered.conf 2>/dev/null); no-stdout-log: $(sudo -n grep -c '^no-stdout-log' /opt/nabdah/deploy/coturn/turnserver.rendered.conf 2>/dev/null)"
P "coturn docker diff: $($DK diff nabdah-coturn 2>/dev/null | wc -l) changed paths"
$DK diff nabdah-coturn 2>/dev/null | head -40 | sed 's/^/cleanup: diskwatch:   /'
echo "-- coturn largest directories and files in the layer"
$DK exec nabdah-coturn sh -c 'du -xk / 2>/dev/null | sort -rn | head -12; echo; find / -xdev -type f -size +10M 2>/dev/null | head -12 | while read f; do ls -l "$f"; done' 2>&1 | awk 'NF==2{printf "cleanup: diskwatch:   %.1f MB %s\n",$1/1024,$2; next} {print "cleanup: diskwatch:   " $0}' | cut -c1-200
echo "## 4. patient-web"
$DK exec nabdah-patient-web sh -c 'du -xk /app/.next/server /app/.next/cache /tmp 2>/dev/null' 2>&1 | awk '{printf "cleanup: diskwatch:   patient-web %.1f MB %s\n",$1/1024,$2}'
echo "## done"
