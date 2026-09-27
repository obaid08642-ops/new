"""Admin panel sweep: every GET the admin pages make (static literals from admin/src/pages/**), replayed through the
real admin BFF with a 2FA admin session. A page whose load call fails is a broken screen.
Template paths (${...}) are skipped here; detail screens are covered by the domain journeys."""
import os, re, glob
from lib import journey, step

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'admin', 'src')
CALL = re.compile(r"(?:apiFetch|adminFetch|fetchWithAdminGuard)(?:<[^>]*>)?\(\s*(['\"`])(/[^'\"`]+)\1(\s*,\s*\{[^}]*method\s*:\s*['\"](\w+)['\"])?", re.S)


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
            found.setdefault(path, os.path.relpath(f, ROOT))
    return found


def run(admin):
    gets = admin_gets()
    journey(f'admin sweep: {len(gets)} page load calls')
    for path, page in sorted(gets.items()):
        r = admin.get(path)
        step(f'{page}: GET {path}', r.ok, r)


if __name__ == '__main__':
    import j_admin
    from lib import summary
    admin, _ = j_admin.login()
    run(admin)
    summary()
