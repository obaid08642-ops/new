#!/bin/bash
# READ-ONLY Cloudflare inspection (2026-10-14). Needs CF (API token) and Z (zone id) in the environment.
# Prints plan, settings and rules; never the token.
set +e
api() { curl -s -H "Authorization: Bearer $CF" -H 'Content-Type: application/json' "https://api.cloudflare.com/client/v4$1"; }
echo "## cf token"; api /user/tokens/verify | jq -c '{success, status: .result.status, errors: [.errors[].message]}'
echo "## zone"; api /zones/$Z | jq -c '.result | {name, status, plan: .plan.name, paused}'
echo "## dns records (name, type, proxied)"; api "/zones/$Z/dns_records?per_page=100" | jq -r '.result[] | "\(.name) \(.type) proxied=\(.proxied)"' | sed -E 's/[0-9]{1,3}(\.[0-9]{1,3}){3}/<ip>/g'
echo "## settings"; for s in cache_level browser_cache_ttl always_online ssl min_tls_version http3 brotli early_hints; do echo "$s=$(api /zones/$Z/settings/$s | jq -c '.result.value')"; done
echo "## rulesets per phase"
for p in http_request_firewall_custom http_ratelimit http_request_cache_settings http_request_firewall_managed http_config_settings; do
  echo "-- $p"; api /zones/$Z/rulesets/phases/$p/entrypoint | jq -c '{success, errors: [.errors[].message], rules: [.result.rules[]? | {description, expression, action}]}'
done
echo "## page rules"; api /zones/$Z/pagerules | jq -c '[.result[]? | {targets, actions, status}]'
echo "## workers routes"; api /zones/$Z/workers/routes | jq -c '[.result[]? | {pattern, script}]'
echo "## cf-inspect done"
