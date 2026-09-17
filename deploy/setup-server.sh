#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Nabdah Plus — one-shot production server setup (Ubuntu 24.04, OVH)
# Installs: Docker, Compose, UFW, fail2ban, swap, sysctl tuning,
#           logrotate, AWS CLI (for R2 backups)
# Idempotent — safe to re-run.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail
exec > >(tee -a /var/log/nabdah-setup.log) 2>&1

echo "═══ [1/8] System update ═══"
apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

echo "═══ [2/8] Docker + Compose plugin ═══"
if ! command -v docker &>/dev/null; then
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi
docker --version && docker compose version

echo "═══ [3/8] Swap 4G (RAM headroom for Mongo+Redis+Node) ═══"
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile
  mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl -w vm.swappiness=10

echo "═══ [4/8] sysctl network tuning (WebRTC/voice) ═══"
cat > /etc/sysctl.d/99-nabdah.conf <<'EOF'
vm.swappiness=10
net.core.rmem_max=26214400
net.core.wmem_max=26214400
net.ipv4.udp_rmem_min=8192
net.ipv4.udp_wmem_min=8192
net.core.somaxconn=4096
net.ipv4.tcp_tw_reuse=1
fs.file-max=2097152
EOF
sysctl --system -q

echo "═══ [5/8] UFW firewall ═══"
apt-get install -y -qq ufw
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp          comment 'SSH'
ufw allow 80/tcp          comment 'HTTP (ACME + redirect)'
ufw allow 443/tcp         comment 'HTTPS'
ufw allow 3478            comment 'STUN/TURN'
ufw allow 5349            comment 'TURNS'
ufw allow 7881/tcp        comment 'LiveKit RTC TCP'
ufw allow 7882/udp        comment 'LiveKit RTC UDP'
ufw allow 40000:49999/udp comment 'coturn relay'
ufw allow 50000:50100/udp comment 'LiveKit RTC range'
ufw --force enable
ufw status verbose

echo "═══ [6/8] fail2ban ═══"
apt-get install -y -qq fail2ban
cp /opt/nabdah/deploy/fail2ban/jail.local /etc/fail2ban/jail.local
systemctl enable --now fail2ban
systemctl restart fail2ban

echo "═══ [7/8] SSH hardening (safe — keeps password login for ubuntu user) ═══"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 4/' /etc/ssh/sshd_config
sed -i 's/^#\?ClientAliveInterval.*/ClientAliveInterval 300/' /etc/ssh/sshd_config
sed -i 's/^#\?ClientAliveCountMax.*/ClientAliveCountMax 2/' /etc/ssh/sshd_config
systemctl reload ssh

echo "═══ [8/8] logrotate + AWS CLI (R2 backups) ═══"
apt-get install -y -qq logrotate unzip
cp /opt/nabdah/deploy/scripts/logrotate.conf /etc/logrotate.d/nabdah
if ! command -v aws &>/dev/null; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp && /tmp/aws/install --update && rm -rf /tmp/aws*
fi

echo "✅ Server setup complete."
