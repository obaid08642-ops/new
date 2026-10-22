#!/bin/bash
# Allow TCP 80/443 to the nginx container only from Cloudflare edge IPs.
# Docker-published ports bypass ufw/INPUT, so rules go in DOCKER-USER.
# PREREQUISITE: live.nabd.plus must be proxied (orange cloud) first, otherwise
# LiveKit clients that connect directly to the origin on 443 are cut off.
# Rollback: iptables -F NABD-CF && ip6tables -F NABD-CF
set -euo pipefail

v4=$(curl -fsS https://www.cloudflare.com/ips-v4)
v6=$(curl -fsS https://www.cloudflare.com/ips-v6)
[ "$(echo "$v4" | wc -l)" -ge 10 ] || { echo "Cloudflare IPv4 list looks wrong; aborting"; exit 1; }

apply() {
  local ipt=$1 list=$2
  $ipt -N NABD-CF 2>/dev/null || $ipt -F NABD-CF
  $ipt -A NABD-CF -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
  for cidr in $list; do $ipt -A NABD-CF -s "$cidr" -j RETURN; done
  $ipt -A NABD-CF -j DROP
  $ipt -C DOCKER-USER -p tcp -m conntrack --ctorigdstport 80 -j NABD-CF 2>/dev/null \
    || $ipt -I DOCKER-USER -p tcp -m conntrack --ctorigdstport 80 -j NABD-CF
  $ipt -C DOCKER-USER -p tcp -m conntrack --ctorigdstport 443 -j NABD-CF 2>/dev/null \
    || $ipt -I DOCKER-USER -p tcp -m conntrack --ctorigdstport 443 -j NABD-CF
}

apply iptables "$v4"
ip6tables -L DOCKER-USER >/dev/null 2>&1 && apply ip6tables "$v6"

command -v netfilter-persistent >/dev/null && netfilter-persistent save
echo "Locked: 80/443 accept Cloudflare only. Verify from a non-Cloudflare host:"
echo "  curl -sk -m 8 -o /dev/null -w '%{http_code}\n' --resolve api.nabd.plus:443:<ORIGIN_IP> https://api.nabd.plus/   # expect 000 (timeout)"
