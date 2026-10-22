#!/bin/bash
# ops-detach: waits on the server, see server-inspect.yml
# Read only (2026-10-22). Run 39858901688 started 60-deploy-main detached on the server (at c41f78667, before ClamAV was
# added to the task) and the workflow was cancelled while the task kept running. This waits for that task's exit line,
# then prints its public lines and the state the deploy left: release, images, health, ClamAV, upload scan mode.
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
DK="sudo -n docker"
LOG=ops-60-deploy-main.log
echo "## deploy-result"
for i in $(seq 1 240); do grep -q '^ops-exit=' $LOG 2>/dev/null && break; sleep 15; done
echo "status: deploy60 exit=$(grep -m1 '^ops-exit=' $LOG 2>/dev/null | cut -d= -f2 || echo none) log_lines=$(wc -l < $LOG 2>/dev/null || echo 0)"
grep -E '^(deploy|status|migrate):' $LOG 2>/dev/null | sed -E 's/[0-9]{1,3}(\.[0-9]{1,3}){3}/<ip>/g' | sed 's/^/status: log /' | cut -c1-220
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null || echo absent; }
echo "status: release_file=$(sudo -n cat $D/RELEASE 2>/dev/null | awk '{print substr($1,1,12)}')"
for c in backend worker patient-web admin-web nginx clamav meilisearch; do
  echo "status: container $c health=$(health nabdah-$c) image=$($DK inspect -f '{{.Config.Image}}' nabdah-$c 2>/dev/null | sed 's/.*://')"
done
echo "status: backend UPLOAD_SCAN=$($DK exec nabdah-backend printenv UPLOAD_SCAN 2>/dev/null || echo unset) CLAMD_HOST_set=$($DK exec nabdah-backend sh -c '[ -n "$CLAMD_HOST" ] && echo yes || echo no' 2>/dev/null)"
echo "status: mem_available_mb=$(awk '/^MemAvailable:/{print int($2/1024)}' /proc/meminfo) disk=$(df -P / | awk 'NR==2{print $5}')"
c=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness); echo "status: api=$c"
