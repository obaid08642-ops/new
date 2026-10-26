"""Journey (QA A-05): social sign-in gating, API and MongoDB.
  - GET /auth/social/config says which providers this backend can finish (public client ids, never secrets).
  - POST /auth/social-login for each provider with an invalid token: a provider that is not configured or a bad token
    is refused with the server's own message; no user is created (MongoDB users count is unchanged).
Google/Apple/X/Snapchat are not signed in here: the test stack has no provider credentials, so the verified sign-in
itself is not reachable. The UI buttons (shown or hidden by the config) are not clicked in this journey."""
import json
import subprocess

from lib import Client, journey, step

PROVIDERS = ['google', 'apple', 'x', 'snapchat']


def users_count():
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', 'db.users.countDocuments()'],
                         capture_output=True, text=True).stdout.strip()
    return int(out) if out.isdigit() else None


def main():
    journey('social sign-in A-05: the server config says which providers are open')
    c = Client(None, 'anon')
    r = c.get('/auth/social/config')
    step('social config answers', r.ok, r.status)
    cfg = r.body if isinstance(r.body, dict) else {}
    print(f'    config: {json.dumps(cfg, ensure_ascii=False)[:400]}')

    journey('social sign-in A-05: a provider with a bad token creates no account')
    before = users_count()
    for p in PROVIDERS:
        r = c.post('/auth/social-login', {'provider': p, 'token': 'qa-invalid-token'})
        step(f'{p}: the server refuses an invalid token or an unconfigured provider', not r.ok, f'{r.status} {str(r.body)[:200]}')
    after = users_count()
    step('MongoDB: no user was created by the refused sign-ins', before is not None and before == after, f'before {before} after {after}')


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
