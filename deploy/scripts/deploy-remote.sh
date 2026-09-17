#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Nabdah Plus — REMOTE deployment driver (runs from our machine)
# Pushes the full source to the server and executes the deployment.
# Usage: bash deploy-remote.sh <SERVER_IP> <SSH_USER> [SSH_PORT]
# Requires: sshpass (SSH_PASS env), rsync
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

IP="${1:?server ip required}"
USER="${2:-ubuntu}"
PORT="${3:-22}"
: "${SSH_PASS:?export SSH_PASS=<server password>}"

SSH="sshpass -e ssh -o StrictHostKeyChecking=no -p $PORT $USER@$IP"
SCP="sshpass -e scp -o StrictHostKeyChecking=no -P $PORT"
ROOT="/mnt/agents/output/projects"

echo "═══ [1/4] rsync source → /opt/nabdah ═══"
$SSH "sudo mkdir -p /opt/nabdah && sudo chown -R $USER:$USER /opt/nabdah"
for d in nabdah-backend Napd-admin deploy; do
  rsync -az --delete -e "sshpass -e ssh -o StrictHostKeyChecking=no -p $PORT" \
    --exclude node_modules --exclude .git --exclude dist --exclude .next --exclude .expo \
    "$ROOT/$d" "$USER@$IP:/opt/nabdah/"
done

echo "═══ [2/4] server setup (docker/ufw/fail2ban/sysctl) ═══"
$SSH "sudo bash /opt/nabdah/deploy/setup-server.sh"

echo "═══ [3/4] master deploy ═══"
$SSH "cd /opt/nabdah/deploy && sudo bash scripts/deploy.sh"

echo "═══ [4/4] install backup cron ═══"
$SSH '(sudo crontab -l 2>/dev/null | grep -v nabdah; echo "0 3 * * * /opt/nabdah/deploy/scripts/backup.sh >> /var/log/nabdah-backup.log 2>&1") | sudo crontab -'

echo "✅ REMOTE DEPLOY FINISHED"
