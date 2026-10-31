#!/bin/bash
# READ-ONLY: where the disk goes (run 66: 85% used, but the backups dir holds only ~1 GB). Prints sizes of directories, docker's own totals
# and the largest docker volumes by NAME, plus journal and apt cache sizes. Never prints file contents or environment values. Writes nothing.
set -u
say() { echo "status: disk: $*"; }
say "df /: $(df -Ph / | awk 'NR==2 {print $3" used of "$2" ("$5")"}')"
for d in /opt/nabdah /opt/nabdah/backups /opt/nabdah/releases /opt/nabdah/catalogue /var/lib/docker /var/log /var/cache/apt /tmp /home /root; do
  sudo -n test -d "$d" && say "$d $(sudo -n du -sh -x "$d" 2>/dev/null | cut -f1)"
done
say "docker system df:"; sudo -n docker system df 2>/dev/null | sed 's/^/status: disk:   /'
say "largest volumes (name, size):"
sudo -n docker system df -v 2>/dev/null | awk '/^VOLUME NAME/{f=1;next} /^$/{f=0} f {print $1, $NF}' | sort -k2 -h -r 2>/dev/null | head -8 | sed 's/^/status: disk:   /'
say "largest container logs:"
sudo -n sh -c 'ls -1S /var/lib/docker/containers/*/*-json.log 2>/dev/null | head -5' | while read -r f; do say "  $(sudo -n du -h "$f" | cut -f1) $(sudo -n docker inspect -f '{{.Name}}' "$(basename "$(dirname "$f")")" 2>/dev/null)"; done
say "journal: $(sudo -n journalctl --disk-usage 2>/dev/null | grep -o '[0-9.]*[KMGT]' | head -1)"
say "largest dirs under /opt/nabdah:"; sudo -n du -xh --max-depth=2 /opt/nabdah 2>/dev/null | sort -h -r | head -10 | sed 's/^/status: disk:   /'
