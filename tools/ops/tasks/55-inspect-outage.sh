#!/bin/bash
# READ-ONLY (build session, 2026-10-14). Cause of the 2026-10-14 outage (Cloudflare 522, SSH timeouts from runners).
# Collects: boots, OOM kills, kernel messages, disk/memory, container restarts and logs around the outage, nginx
# errors, fail2ban bans, firewall. Secret VALUES are never printed: log lines naming a credential are dropped.
set +e
sec() { echo; echo "## $1"; }
T() { timeout 40 "$@"; }
S=${OUTAGE_SINCE:-"12 hours ago"}
redact() { grep -viE 'authorization|bearer|password|passwd|secret|token|api[_-]?key|cookie|set-cookie|private' | cut -c1-400; }
sec "time, uptime, boots"; date -u; T uptime; T sudo -n last -x reboot shutdown 2>&1 | head -10; T sudo -n journalctl --list-boots --no-pager 2>&1 | tail -5
sec "disk and inodes"; T df -h 2>&1 | grep -vE 'tmpfs|overlay'; T df -i / 2>&1
sec "memory and swap"; T free -m; T swapon --show 2>&1; T cat /proc/pressure/memory 2>&1; T cat /proc/pressure/io 2>&1
sec "OOM kills and kernel errors since $S"; T sudo -n journalctl -k --since "$S" --no-pager 2>&1 | grep -iE 'oom|killed process|out of memory|hung task|blocked for more|i/o error|ext4|nvme|soft lockup|link is down|nf_conntrack|table full' | tail -60
sec "dmesg tail (errors and warnings)"; T sudo -n dmesg -T --level=err,warn 2>&1 | tail -40
sec "system journal: docker, containerd, sshd, network, systemd failures since $S"
T sudo -n journalctl --since "$S" --no-pager -p warning -u docker -u containerd -u ssh -u sshd -u systemd-networkd -u networking -u NetworkManager 2>&1 | redact | tail -80
T systemctl --failed --no-pager 2>&1 | head -20
sec "load history (sar, if installed)"; T sar -q 2>&1 | tail -30; T sar -r 2>&1 | tail -30
sec "containers: restarts, OOMKilled, exit codes, start/finish"
for c in $(sudo -n docker ps -aq 2>/dev/null); do sudo -n docker inspect $c --format '{{.Name}} restarts={{.RestartCount}} oom={{.State.OOMKilled}} status={{.State.Status}} exit={{.State.ExitCode}} started={{.State.StartedAt}} finished={{.State.FinishedAt}} health={{if .State.Health}}{{.State.Health.Status}}{{end}} mem_limit={{.HostConfig.Memory}} restart_policy={{.HostConfig.RestartPolicy.Name}}' 2>/dev/null; done
sec "docker events since $S (die, oom, kill, restart, health)"
T sudo -n docker events --since "$(date -u -d "$S" +%Y-%m-%dT%H:%M:%S)" --until "$(date -u +%Y-%m-%dT%H:%M:%S)" --filter type=container --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}}' 2>&1 | grep -E ' (die|oom|kill|restart|start|stop|health_status)' | tail -120
sec "container logs since $S (errors only, credentials dropped)"
for c in $(sudo -n docker ps -a --format '{{.Names}}' 2>/dev/null); do
  echo "-- $c"
  T sudo -n docker logs --since "$S" --timestamps $c 2>&1 | grep -iE 'error|fatal|panic|oom|heap|killed|ECONN|ETIMEDOUT|timeout|refused|unhealthy|exited|SIGTERM|SIGKILL|out of memory|too many|EMFILE|ENOSPC' | redact | tail -40
done
sec "nginx error log (tail, credentials dropped)"
for f in /var/log/nginx/error.log /opt/nabdah/deploy/nginx/logs/error.log; do [ -f $f ] && { echo "-- $f"; T sudo -n tail -n 120 $f 2>&1 | redact; }; done
NG=$(sudo -n docker ps --format '{{.Names}}' 2>/dev/null | grep -i nginx | head -1); [ -n "$NG" ] && { echo "-- docker logs $NG (5xx/upstream)"; T sudo -n docker logs --since "$S" $NG 2>&1 | grep -E 'upstream|\[error\]|\[crit\]|\[alert\]|\[emerg\]| 50[234] ' | redact | tail -60; }
sec "fail2ban"; T sudo -n fail2ban-client status 2>&1; for j in $(sudo -n fail2ban-client status 2>/dev/null | sed -n 's/.*Jail list:\s*//p' | tr ',' ' '); do echo "-- $j"; T sudo -n fail2ban-client status $j 2>&1 | grep -E 'Currently|Total'; done
T sudo -n grep -hE 'Ban |Unban ' /var/log/fail2ban.log 2>/dev/null | tail -30 | sed -E 's/([0-9]{1,3}\.[0-9]{1,3})\.[0-9]{1,3}\.[0-9]{1,3}/\1.x.x/g'
sec "firewall"; T sudo -n ufw status verbose 2>&1 | head -30; T sudo -n iptables -S 2>&1 | grep -ciE 'drop|reject' ; T sudo -n nft list ruleset 2>&1 | grep -cE 'drop|reject'
sec "sshd"; T sudo -n sshd -T 2>/dev/null | grep -iE '^(port|maxstartups|maxsessions|logingracetime|clientalive)'; T sudo -n journalctl -u ssh -u sshd --since "$S" --no-pager 2>&1 | grep -ciE 'beginning MaxStartups|drop connection|maxstartups'
sec "connections now"; T ss -s 2>&1 | head -10; T sudo -n sysctl net.netfilter.nf_conntrack_count net.netfilter.nf_conntrack_max 2>&1
sec "top memory processes"; T ps -eo pid,comm,rss,pcpu --sort=-rss 2>&1 | head -15
echo; echo "## inspect-outage done"
