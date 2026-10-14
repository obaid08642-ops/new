#!/bin/bash
# READ-ONLY (build session, 2026-10-14). Full JSON of the zone's rulesets and the settings the reconciliation of
# docs/deploy/CLOUDFLARE_STATE.md with deploy/cloudflare/rules.md needs (enabled flags, action_parameters, ids),
# so the apply tasks can be written against the live state. Never prints a credential.
set +e
. "$(dirname "$0")/_auth.sh"
api() { cf_curl -H 'Content-Type: application/json' "https://api.cloudflare.com/client/v4$1"; }
echo "## cf credential"; cf_verify
for p in http_request_cache_settings http_ratelimit http_request_firewall_custom http_request_firewall_managed http_config_settings http_request_late_transform http_response_headers_transform; do
  echo "## ruleset $p"
  api /zones/$Z/rulesets/phases/$p/entrypoint | jq -c '{success, errors: [.errors[]?.message], id: .result.id, version: .result.version, rules: [.result.rules[]? | {id, description, enabled, action, expression, action_parameters, ratelimit}]}'
done
echo "## zone rulesets (all kinds and phases)"; api /zones/$Z/rulesets | jq -c '[.result[]? | {id, name, kind, phase}]'
echo "## settings"
for s in security_level browser_check challenge_ttl always_use_https automatic_https_rewrites tls_1_3 0rtt rocket_loader ssl min_tls_version always_online cache_level browser_cache_ttl development_mode; do
  echo "$s=$(api /zones/$Z/settings/$s | jq -c '.result.value')"
done
echo "bot_fight_mode=$(api /zones/$Z/bot_management | jq -c '{fight_mode: .result.fight_mode, enable_js: .result.enable_js}')"
echo "tiered_cache=$(api /zones/$Z/argo/tiered_caching | jq -c '.result.value')"
echo "origin_pulls=$(api /zones/$Z/origin_tls_client_auth/settings | jq -c '.result.enabled')"
echo "## cf-inspect-full done"
