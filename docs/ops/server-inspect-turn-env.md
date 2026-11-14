# Lines for `.github/workflows/server-inspect.yml` (branch `review/server-inspect`): task 70b-turn-env

The job that runs the tasks needs the GitHub environment `production` (the secrets live there). Two additions, mirroring the 70-mail-env ones.

1. In the `env:` of the step "Run tasks", after `MAILJET_SECRET_KEY`:

```yaml
          # Cloudflare TURN keys (owner, 2026-10-30): reach the server only on ssh stdin, for tasks/70b-turn-env.sh
          CF_TURN_KEY_ID: ${{ secrets.CF_TURN_KEY_ID }}
          CF_TURN_API_TOKEN: ${{ secrets.CF_TURN_API_TOKEN }}
```

2. In the task loop, right after the `if [ "$t" = 70-mail-env ]; then ... fi` block:

```bash
            if [ "$t" = 70b-turn-env ]; then
              # the two keys as a mode-600 file in the deploy user's home; the task checks them, moves them into .env.production by name and shreds the file.
              # printf is a shell builtin: the values are on no command line.
              { [ -n "$CF_TURN_KEY_ID" ] && printf 'CF_TURN_KEY_ID=%s\n' "$CF_TURN_KEY_ID"
                [ -n "$CF_TURN_API_TOKEN" ] && printf 'CF_TURN_API_TOKEN=%s\n' "$CF_TURN_API_TOKEN"; } \
                | $SSH 'umask 077; cat > ops-turn.env' && echo "turn-env: key file delivered" | tee -a report.txt
            fi
```

The task prints only `status:` lines (names, an HTTP status, ok/abort), which the public-log filter already lets through. Add `70b-turn-env` to `tools/ops/RUN` after the deploy that carries the TURN code (PR #2180): first with `APPLY=""` (dry run: checks the key with Cloudflare, writes nothing), then `APPLY="yes"`.
