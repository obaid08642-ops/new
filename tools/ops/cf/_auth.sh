# Sourced by tools/ops/cf/*.sh. Cloudflare API auth from the workflow env, never printed:
#   CFE set (secret CLOUDFLARE_EMAIL)  -> Global API Key in CF: X-Auth-Email + X-Auth-Key
#   CFE empty                          -> API token in CF: Authorization: Bearer
# The headers go to curl on stdin (--config -), so neither value appears in a command line or in the log.
CF_AUTH_MODE=$([ -n "${CFE:-}" ] && echo global-key || echo token)
cf_curl() {
  # usage: cf_curl [curl args...] <url>
  if [ "$CF_AUTH_MODE" = global-key ]; then
    printf 'header = "X-Auth-Email: %s"\nheader = "X-Auth-Key: %s"\n' "$CFE" "$CF" | curl -s --config - "$@"
  else
    printf 'header = "Authorization: Bearer %s"\n' "$CF" | curl -s --config - "$@"
  fi
  sleep 0.3   # the API rate-limited a burst of reads on 2026-10-14
}
# verify the credential: a token has /user/tokens/verify; a Global API Key is checked with /user
cf_verify() {
  if [ "$CF_AUTH_MODE" = global-key ]; then
    cf_curl https://api.cloudflare.com/client/v4/user | jq -c '{mode: "global-key", success, errors: [.errors[]?.message]}'
  else
    cf_curl https://api.cloudflare.com/client/v4/user/tokens/verify | jq -c '{mode: "token", success, status: .result.status, errors: [.errors[]?.message]}'
  fi
}
