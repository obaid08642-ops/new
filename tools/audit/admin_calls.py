"""Every API call an admin page makes reaches a real backend route (same method).

  python3 tools/audit/admin_calls.py          (from the repo root; exit 1 on a call with no route)

The admin BFF (admin/src/pages/api/admin/[...path].ts) maps /api/admin/<x> to /api/v1/<x>, and utils/api.ts toBffUrl maps
/admin/<x> and /api/v1/admin/<x> to the same, so a page that writes /api/admin/admin/providers/1/approve reaches
POST /api/v1/admin/providers/:id/approve. The route list is the static one from tools/audit/routes.py. Calls whose URL is built from a
variable (not a string or template literal that starts with /api/ or /admin/) are not seen; the sidebar and dead-button checks are in
admin/src/lib/sidebar-integrity.test.ts.
"""
import json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)

with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as t:
    out = t.name
subprocess.run([sys.executable, 'tools/audit/routes.py', out], check=True, stdout=subprocess.DEVNULL)
ROUTES = json.load(open(out)); os.unlink(out)
TABLE = [([x for x in (r['p'].rstrip('/') or '/').split('/')], r['m']) for r in ROUTES]

def seg_match(route, call):
    """Segment by segment: equal, or the route has a :param, or the call has a variable segment (:p, for example an action name picked at run time)."""
    if len(route) != len(call):
        return False
    return all(a == b or a.startswith(':') or b == ':p' for a, b in zip(route, call))

def backend_path(u):
    for pre in ('/api/admin/', '/api/v1/admin/', '/api/v1/', '/admin/'):
        if u.startswith(pre):
            return '/' + u[len(pre):]
    return u

CALL = re.compile(r"(apiFetch|fetchWithAdminGuard|adminFetch|adminMutation|fetchJson)\s*(?:<[^>]*>)?\(\s*(`[^`]*`|'[^']*'|\"[^\"]*\")", re.S)

def args_text(s, start):
    """The text of the call's argument list (balanced parentheses), so `method:` is read from this call only."""
    depth, i = 0, s.index('(', start)
    for j in range(i, min(len(s), i + 1500)):
        if s[j] == '(': depth += 1
        elif s[j] == ')':
            depth -= 1
            if depth == 0: return s[i:j]
    return s[i:i + 600]

def files():
    for d in ('admin/src/pages/admin', 'admin/src/components', 'admin/src/lib', 'admin/src/utils', 'admin/src/hooks'):
        for r, _, fs in os.walk(d):
            for f in fs:
                if f.endswith(('.ts', '.tsx')) and '.test.' not in f and '__tests__' not in r:
                    yield os.path.join(r, f)

bad, total = [], 0
for f in files():
    s = open(f, encoding='utf-8').read()
    for m in CALL.finditer(s):
        lit = m.group(2)[1:-1]
        if not lit.startswith(('/api/', '/admin/')):
            continue
        u = lit.split('?')[0]
        u = re.sub(r'(?<=[a-z-])\$\{.*$', '', u)       # a query string glued to the path
        u = re.sub(r'\$\{(?:[^{}]|\{[^{}]*\})*\}', ':p', u)
        u = re.sub(r'(:p)+.*$', ':p', u) if re.search(r':p:p', u) else u   # ${segment}${query}: the second placeholder is a query
        u = u.rstrip('/')
        mm = re.search(r"method:\s*['\"](GET|POST|PUT|PATCH|DELETE)['\"]", args_text(s, m.start()))
        method = mm.group(1) if mm else 'GET'
        if m.group(1) == 'adminMutation':
            mm2 = re.search(r"['\"](POST|PUT|PATCH|DELETE)['\"]", args_text(s, m.start()))
            method = mm2.group(1) if mm2 else 'POST'
        total += 1
        path = backend_path(u)
        parts = path.split('/')
        if not any(seg_match(r, parts) and (mt == method or mt == 'ALL') for r, mt in TABLE):
            bad.append(f"{f}:{s.count(chr(10), 0, m.start()) + 1}  {method} {u}  ->  {path}")
print(f"admin API calls checked: {total}; with no backend route: {len(bad)}")
for b in bad:
    print('  ' + b)
sys.exit(1 if bad else 0)
