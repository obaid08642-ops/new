"""Journey (admin walkthrough D1): a super admin opens the catalogue screens (admin/src/pages/admin/catalog-manager.tsx and
approvals.tsx) and gets the same lists an admin gets. Before the fix the lab, radiology and nursing services refused
role super_admin (403) although the controllers' @Roles(ADMIN) let it in, so both screens showed "failed to load".
  Stack: backend :8002, admin :3001; the super admin is seeded by seed_admin.js (owner@nabd.test)."""
import os

from lib import journey, step

OWNER_EMAIL = os.environ.get('LIVE_OWNER_EMAIL', 'owner@nabd.test')
OWNER_PASSWORD = os.environ.get('LIVE_OWNER_PASSWORD', 'Own3r!Live-Pass')
CATALOGUES = ['/labs/admin/catalog', '/radiology/admin/catalog', '/nursing/admin/catalog']


def rows(r):
    b = r.body
    return b if isinstance(b, list) else (b.get('data', []) if isinstance(b, dict) else [])


def run():
    import j_admin
    gate_web, _ = j_admin.login()
    owner, _ = j_admin.login(OWNER_EMAIL, OWNER_PASSWORD)

    journey('admin catalogues: admin and super admin read the same lists (catalog-manager, approvals)')
    for path in CATALOGUES:
        a = gate_web.get(path)
        s = owner.get(path)
        step(f'admin reads GET {path} (200)', a.status == 200, a)
        step(f'super admin reads GET {path} (200)', s.status == 200, s)
        step(f'{path}: both roles see the same number of items', a.status == 200 and len(rows(a)) == len(rows(s)), f'{len(rows(a))} vs {len(rows(s))}')


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
