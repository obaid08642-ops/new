#!/usr/bin/env bash
# GET-only: time to first byte and Cloudflare cache status of the public pages, API answers and a picture, N requests each.
# Usage: tools/perf/edge-cache-timing.sh [site-url] [api-url] [requests-per-url]
# Run it before and after the cache rules (tools/ops/cf/45-47) and compare: p50/p95 TTFB and the share of HIT.
set -u
SITE="${1:-https://nabd.plus}"; API="${2:-https://api.nabd.plus}"; N="${3:-10}"
IMG="${IMG_URL:-$(curl -s --max-time 20 "$API/api/v1/public/categories/ar/items?limit=24" | grep -oE 'https://cdn\.nabd\.plus/[^"\\ ]+\.(jpg|jpeg|png|webp)' | head -1)}"
URLS=("$SITE/ar" "$SITE/ar/c" "$SITE/ar/consultations/doctors" "$API/api/v1/public/categories/ar/items?limit=24" "$API/api/v1/doctors?limit=5")
[ -n "$IMG" ] && URLS+=("$IMG")
for u in "${URLS[@]}"; do
  rows=$(for _ in $(seq "$N"); do curl -s -o /dev/null -H 'accept: text/html' -D /tmp/.edge-h.$$ -w '%{time_starttransfer}\n' "$u" | tr -d '\r' | tr '\n' ' '; grep -i '^cf-cache-status' /tmp/.edge-h.$$ | tr -d '\r' | awk '{print $2}'; done)
  echo "$rows" | awk -v u="$u" '{t[NR]=$1*1000; s[$2]++} END {n=NR; m=0; for (i=1;i<=n;i++) for (j=i+1;j<=n;j++) if (t[j]<t[i]) {x=t[i];t[i]=t[j];t[j]=x};
    i50=int((n+1)/2); i95=int(n*0.95+0.999); if (i95>n) i95=n; line=""; for (k in s) line=line k "=" s[k] " ";
    printf "%-78s ttfb p50=%4.0f p95=%4.0f ms  %s\n", substr(u,1,78), t[i50], t[i95], line}'
done
rm -f /tmp/.edge-h.$$
