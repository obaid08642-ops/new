#!/bin/bash
# READ-ONLY (build session, 2026-10-14). Who or what powered the host off on 2026-10-13 21:49 UTC
# (docs/deploy/INCIDENT_2026-10-14.md "Open"). Lines naming a credential are dropped.
set +e
sec() { echo; echo "## $1"; }
T() { timeout 40 "$@"; }
redact() { grep -viE 'authorization|bearer|password|passwd|secret|token|api[_-]?key|cookie|private' | cut -c1-300; }
sec "previous boot: last 150 journal lines"; T sudo -n journalctl -b -1 --no-pager -n 150 2>&1 | redact
sec "previous boot: logind / power / shutdown lines"; T sudo -n journalctl -b -1 --no-pager 2>&1 | grep -iE 'power key|powering off|power-off|poweroff|shutdown|halt|reboot|acpi|systemd-logind|Stopping|reached target' | redact | tail -60
sec "logins 2026-10-13 20:00-21:50 (auth.log)"; T sudo -n grep -hE '^(2026-10-13T2[01]|Oct 13 2[01]:)' /var/log/auth.log /var/log/auth.log.1 2>/dev/null | grep -iE 'Accepted|session opened|sudo:|COMMAND' | redact | tail -40
sec "last logins"; T last -n 15 -F 2>&1 | sed -E 's/([0-9]{1,3}\.[0-9]{1,3})\.[0-9]{1,3}\.[0-9]{1,3}/\1.x.x/g'
sec "apt / unattended-upgrades"; T sudo -n grep -hE 'Start-Date|Commandline|linux-image' /var/log/apt/history.log /var/log/apt/history.log.1 2>/dev/null | tail -30
T sudo -n tail -n 30 /var/log/unattended-upgrades/unattended-upgrades.log 2>&1
T sudo -n grep -rhE 'Automatic-Reboot' /etc/apt/apt.conf.d/ 2>/dev/null
sec "cloud-init / qemu guest agent (provider-initiated stop shows here)"; T systemctl is-active qemu-guest-agent 2>&1; T sudo -n journalctl -b -1 -u qemu-guest-agent --no-pager 2>&1 | tail -10
sec "fail2ban 2026-10-14 15:54 ban (full address; is it a GitHub runner?)"; T sudo -n grep -h '2026-10-14 15:5.*Ban ' /var/log/fail2ban.log 2>/dev/null
sec "crontab entries with shutdown/reboot"; T sudo -n grep -rhiE 'shutdown|poweroff|reboot|halt' /etc/crontab /etc/cron.d /var/spool/cron/crontabs 2>/dev/null
echo; echo "## inspect-shutdown done"
