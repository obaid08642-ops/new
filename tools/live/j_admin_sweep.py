"""Admin panel sweep: every GET the admin pages make (static literals from admin/src/pages/**), replayed through the
real admin BFF with a 2FA admin session. A page whose load call fails is a broken screen.
Template paths (${...}) are skipped here; detail screens are covered by the domain journeys."""
import os, re, glob, datetime
from lib import journey, step

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'admin', 'src')
CALL = re.compile(r"(?:apiFetch|adminFetch|fetchWithAdminGuard)(?:<[^>]*>)?\(\s*(['\"`])(/[^'\"`]+)\1(\s*,\s*\{[^}]*method\s*:\s*['\"](\w+)['\"])?", re.S)


# The page builds these queries from its own state (a date range the page starts with, the text typed in the box); the sweep sends what
# the page starts with. Without them the backend rightly answers 400.
_today = datetime.date.today()
PAGE_QUERY = {
    '/api/admin/admin/analytics-suite/': f'?from={_today - datetime.timedelta(days=30)}&to={_today}',
    '/api/admin/admin/search': '?q=ab',
}
# Pages the gate admin (operations role) is not meant to open: they belong to the designated owner (modules.manage). The sweep loads them as the owner.
OWNER_ONLY = {'/api/admin/admin/governance/emergency-maintenance', '/api/admin/kill-switches'}
# A call that is refused on purpose until an action has been taken: the page shows that state. The sweep proves the refusal is the intended one.
EXPECTED_REFUSAL = {'/support-session/context': (403, 'impersonation_session_required')}


def admin_gets():
    found = {}
    for f in glob.glob(os.path.join(ROOT, 'pages', '**', '*.tsx'), recursive=True) + glob.glob(os.path.join(ROOT, 'components', '**', '*.tsx'), recursive=True):
        src = open(f, encoding='utf-8').read()
        for m in CALL.finditer(src):
            path, method = m.group(2), (m.group(4) or 'GET').upper()
            if method != 'GET':
                continue
            if '${' in path:
                base, _, _ = path.partition('?')
                base = re.sub(r'\$\{[^}]*\}$', '', base) if base.endswith('}') and base.count('${') == 1 and base.rstrip('}').rfind('?') == -1 and base.endswith('${' + base.split('${')[-1]) else base
                if '${' in base:
                    continue  # id in the path: covered by domain journeys
                path = base
            if path.endswith('/'):
                continue  # `/x/${id}`: the placeholder was the id or the section, so there is nothing to load without one
            found.setdefault(path, os.path.relpath(f, ROOT))
    return found


def run(admin, owner=None):
    gets = admin_gets()
    journey(f'admin sweep: {len(gets)} page load calls')
    for path, page in sorted(gets.items()):
        q = next((v for k, v in PAGE_QUERY.items() if path.startswith(k) and '?' not in path), '')
        caller = admin
        if path in OWNER_ONLY:
            step(f'{page}: GET {path} is refused for the operations admin (owner only)', admin.get(path + q).status == 403, path)
            if owner is None:
                step(f'{page}: GET {path} as the owner', False, 'no owner session')
                continue
            caller = owner
        r = caller.get(path + q)
        if path in EXPECTED_REFUSAL:
            code, message = EXPECTED_REFUSAL[path]
            step(f'{page}: GET {path} answers {code} {message} until a support session is started', r.status == code and message in str(r.body), r)
            continue
        step(f'{page}: GET {path}{q}', r.ok, r)


if __name__ == '__main__':
    import j_admin
    from lib import summary
    admin, _ = j_admin.login()
    owner, _ = j_admin.login(os.environ.get('LIVE_OWNER_EMAIL', 'owner@nabd.test'), os.environ.get('LIVE_OWNER_PASSWORD', 'Own3r!Live-Pass'))
    run(admin, owner)
    summary()
