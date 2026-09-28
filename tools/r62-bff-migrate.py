"""R6-2: rewrite admin callers to real backend paths for the pure 1:1 BFF mapping.
For each apiFetch/fetchWithAdminGuard URL literal starting with /admin/ or
/api/admin/, compute CURRENT upstream via the old rules, then rewrite the
literal to '/api/admin' + upstream-minus-'/api/v1' (query/dynamic parts kept).
Dry run by default; pass --apply to write.
"""
import io
import os
import re
import sys

ADMIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'admin', 'src')
MODULE_PREFIXES = {'support', 'medicines', 'storage', 'insurance', 'emergency', 'legal', 'ai', 'labs', 'radiology', 'nursing'}


def to_bff(url):
    if url.startswith('/api/admin/'):
        return url
    if url.startswith('/'):
        if url.startswith('/api/v1/admin/'):
            return '/api/admin/' + url[len('/api/v1/admin/'):]
        if url.startswith('/admin/'):
            return '/api/admin/' + url[len('/admin/'):]
        if url.startswith('/api/'):
            return url
        return '/api/admin' + url
    return url


def current_upstream(bff_url):
    pathpart = bff_url.split('?')[0]
    assert pathpart.startswith('/api/admin/')
    trailing = pathpart.endswith('/') and len(pathpart) > len('/api/admin/')
    segs = [s for s in pathpart[len('/api/admin/'):].split('/') if s != '']
    decoded = segs
    encoded = '/'.join(segs)
    up = '/api/v1/admin/' + encoded
    if decoded[0:1] == ['orders']:
        up = '/api/v1/admin/' + encoded
    elif decoded[0:1] == ['providers']:
        tail = '/'.join(decoded[1:])
        up = '/api/v1/admin/providers' + ('/' + tail if tail else '')
    elif decoded and decoded[0] in MODULE_PREFIXES:
        stay = (decoded[0] == 'insurance' and decoded[1:2] in (['stats'], ['requests'])) or \
               (decoded[0] == 'nursing' and decoded[1:2] == ['requests'])
        up = ('/api/v1/admin/' + encoded) if stay else ('/api/v1/' + encoded)
    if decoded[0:2] == ['ambulance', 'fleet']:
        up = '/api/v1/admin/ambulance/fleet' + ('/' + '/'.join(decoded[2:]) if len(decoded) > 2 else '')
    if decoded[0:1] == ['locations'] and len(decoded) > 1:
        up = '/api/v1/locations/' + '/'.join(decoded[1:])
    if decoded[0:1] == ['community']:
        up = '/api/v1/community/' + '/'.join(decoded[1:])
    if decoded[0:2] == ['notifications', 'admin']:
        up = '/api/v1/notifications/admin/' + '/'.join(decoded[2:])
    if decoded[0:1] == ['business-rules']:
        up = '/api/v1/business-rules/' + '/'.join(decoded[1:])
    if decoded[0:2] == ['catalogs', 'admin']:
        up = '/api/v1/catalogs/admin/' + '/'.join(decoded[2:])
    if decoded[0:1] == ['loyalty']:
        up = '/api/v1/loyalty/' + '/'.join(decoded[1:])
    if decoded[0:1] in (['chat'], ['chats']):
        up = '/api/v1/' + decoded[0] + '/' + '/'.join(decoded[1:])
    if decoded[0:1] == ['auth']:
        up = '/api/v1/auth/' + '/'.join(decoded[1:])
    if decoded[0:1] == ['support-session']:
        up = '/api/v1/support-session/' + '/'.join(decoded[1:])
    if decoded[0:2] == ['search', 'intent']:
        up = '/api/v1/search/intent'
    if decoded[0:2] == ['provider-onboarding', 'admin']:
        up = '/api/v1/provider-onboarding/admin/' + '/'.join(decoded[2:])
    if decoded[0:1] == ['system-health']:
        up = '/api/v1/system-health/' + '/'.join(decoded[1:])
    if decoded[0:2] == ['nabd-extensions', 'admin']:
        up = '/api/v1/nabd-extensions/admin/' + '/'.join(decoded[2:])
    if trailing and not up.endswith('/'):
        up += '/'
    return up


def bff_path(path):
    if path.startswith('/api/admin/'):
        return path
    if path.startswith('/admin/'):
        return '/api/admin' + path[len('/admin'):]
    if path.startswith('/'):
        return '/api/admin' + path
    return '/api/admin/' + path


def new_form(url):
    """Rewrite a caller URL to the 1:1 form. Returns None if no rewrite needed."""
    # split static head from dynamic/query tail
    m = re.match(r'^([^$?]+)(.*)$', url)
    if not m:
        return None
    head, tail = m.group(1), m.group(2)
    if '${' in head:
        return None
    if not head.startswith('/'):
        return None
    # already migrated (double-admin head): pure 1:1 resolves it correctly
    if head.startswith('/api/admin/admin/'):
        return None
    # legal edits/diffs are served by AdminLegal (/api/v1/admin/legal/*) while
    # reads stay public; callers under /admin/legal/* always mean the admin routes
    if head.startswith('/admin/legal/'):
        return '/api/admin/admin' + head[len('/admin'):] + tail
    bff = to_bff(head) if head.startswith('/api/') else bff_path(head)
    up = current_upstream(bff)
    assert up.startswith('/api/v1/')
    # already in 1:1 form when the pure mapping agrees with the old rules
    pure = '/api/v1/' + bff[len('/api/admin/'):]
    if pure == up:
        return None
    return '/api/admin' + up[len('/api/v1'):] + tail


def process(path, apply):
    text = io.open(path, encoding='utf8').read()
    out = []
    changed = 0
    for l in text.split('\n'):
        def repl(m):
            new = new_form(m.group(2))
            if new is None:
                return m.group(0)
            return m.group(1) + new + m.group(3)
        # apiFetch/fetchWithAdminGuard/adminFetch/adminMutation('...' / `...`)
        # plus raw href="/api/admin/..." and href={`/api/admin/...`} links
        nl = re.sub(r"((?:apiFetch|fetchWithAdminGuard|adminFetch|adminMutation)(?:<[^>]*>)?\(\s*[`'])((?:[^`'\\]|\\.|\\\$\{[^}]*\})+)([`'])", repl, l)

        def repl_href(m):
            if not m.group(2).startswith('/api/admin/'):
                return m.group(0)
            return repl(m)
        nl = re.sub(r"((?:href=)[`'\"]{1})((?:[^`'\"\\]|\\.)+)([`'\"])", repl_href, nl)
        if nl != l:
            changed += 1
        out.append(nl)
    if changed and apply:
        io.open(path, 'w', encoding='utf8').write('\n'.join(out))
    return changed


def main():
    apply = '--apply' in sys.argv
    total = 0
    files = []
    for dirpath, _d, fns in os.walk(ADMIN):
        for fn in fns:
            if fn.endswith(('.ts', '.tsx')):
                p = os.path.join(dirpath, fn)
                n = process(p, apply)
                if n:
                    total += n
                    files.append('%s (%d)' % (os.path.relpath(p, ADMIN), n))
    print(('APPLIED ' if apply else 'WOULD REWRITE ') + str(total) + ' call sites')
    for f in sorted(files):
        print(' ', f)


if __name__ == '__main__':
    main()
