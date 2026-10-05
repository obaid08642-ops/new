"""P15.12 gate-side kill-switch + force-update verification.

Kill switches (14.18): one toggle test per switch. The canonical six read
`backend/src/common/killswitches/killswitches.helper.ts` KILLSWITCH_FEATURES:
  ai -> ai_symptom_checker | recommendations -> recommendations_enabled |
  nudges -> nudges_enabled | live map -> live_map_enabled |
  analytics -> analytics_ingestion_enabled | search -> search_suggestions_enabled
Admin toggle: POST /api/v1/admin/feature-flags/:key {enabled} (SetFeatureFlagDto,
verified in feature-flags.dto.ts); public read-back GET /api/v1/feature-flags;
client-visible surface GET /api/v1/config (ConfigService merges flag rows into
`features` — verified in config.service.ts). Each toggle test asserts the
client-visible surface actually changes: set false -> /config shows false,
set true -> /config shows true. Rows are restored to their pre-run values.

Honest-fail part (no vacuous passes): every toggle goes through
POST /admin/feature-flags/:key, which is an UPSERT — so reading the rows AFTER
the toggles can only ever find them, and a baseline check placed there passes by
construction and can never trip. The baseline is therefore snapshotted and
asserted BEFORE the first write (see run()). The backend contract that makes it
satisfiable: FeatureFlagsService.isEnabled() returns null for an absent row and
ensureSeeded() creates the six rows enabled:true on boot (p15-backend
feature-flags.service.ts, F9 in backend/P15_NOTES.md); if seeding is ever absent
or fails open-closed, this step FAILS and says which keys are missing.

Force-update (R6-5): GET /api/v1/config carries app_versions (fail-open);
admin GET+PUT /api/v1/admin/config/app-versions (verified in
admin-config.controller.ts) is exercised by writing back the exact value just
read — the write path is proven operable with zero net change to the shared
DB (a crash mid-step still leaves the original value in place).

  Stack: backend :8002 (admin login via j_admin, same as the other journeys).
"""
from lib import Client, journey, step

FLAGS = ['ai_symptom_checker', 'recommendations_enabled', 'nudges_enabled',
         'live_map_enabled', 'analytics_ingestion_enabled', 'search_suggestions_enabled']


def flag_rows(anon):
    r = anon.get('/feature-flags')
    rows = r.body if isinstance(r.body, list) else r.items()
    return {str(x.get('key') or x.get('flagName')): bool(x.get('enabled', x.get('isEnabled')))
            for x in rows if isinstance(x, dict)}


def config_features(anon):
    r = anon.get('/config')
    return r, (r.get('features') or {})


def run():
    import j_admin
    admin, _ = j_admin.login()
    anon = Client()

    journey('force-update flag (R6-5): the mechanism is reachable and operable')
    r = anon.get('/config')
    step('/config is public and carries app_versions (fail-open when unset)',
         r.ok and isinstance(r.get('app_versions'), (dict, type(None))), r)
    orig = admin.get('/admin/config/app-versions')
    step('admin app-versions read is reachable', orig.ok and isinstance(orig.body, dict), orig)
    if orig.ok:
        back = admin.req('PUT', '/admin/config/app-versions', orig.body if isinstance(orig.body, dict) else {'apps': {}})
        step('admin app-versions write path is operable (wrote back the value just read: zero net change)',
             back.ok, back)
        r2 = anon.get('/config')
        step('/config serves what the admin wrote', r2.ok and r2.get('app_versions') == (back.body if isinstance(back.body, dict) else back.get('value', back.body)), r2)

    journey('kill switches (14.18): the fail-open baseline the backend fix must provide')
    # Snapshot FIRST, assert against it. POST /admin/feature-flags/:key is an
    # UPSERT, so any baseline read taken after the toggle loop finds the rows by
    # construction and can never fail — the honest signal has to be taken before
    # the journey writes anything.
    snapshot = flag_rows(anon)
    missing = [k for k in FLAGS if k not in snapshot]
    step('the six kill-switch rows are seeded by default (absent must NOT mean disabled)',
         not missing,
         f'missing rows (absent row reads as disabled = fail-closed): {missing}' if missing else
         f'all six present pre-run: {sorted(k for k in snapshot if k in FLAGS)}')

    journey('kill switches (14.18): each toggle changes client-visible behaviour')
    before = dict(snapshot)
    for key in FLAGS:
        start = before.get(key)
        off = admin.post(f'/admin/feature-flags/{key}', {'enabled': False})
        _, feat_off = config_features(anon)
        step(f'{key}: switching OFF reaches /config (clients see false)',
             off.ok and feat_off.get(key) is False, f'set={off.status} config={feat_off.get(key)}')
        on = admin.post(f'/admin/feature-flags/{key}', {'enabled': True})
        _, feat_on = config_features(anon)
        step(f'{key}: switching ON reaches /config (clients see true)',
             on.ok and feat_on.get(key) is True, f'set={on.status} config={feat_on.get(key)}')
        restore = admin.post(f'/admin/feature-flags/{key}', {'enabled': start if start is not None else False})
        step(f'{key}: restored to the pre-run value', restore.ok, restore)

    journey('kill switches (14.18): the toggles left nothing permanently changed')
    after = flag_rows(anon)
    vanished = [k for k in FLAGS if k in snapshot and k not in after]
    drifted = [k for k in FLAGS if k in snapshot and k in after and bool(snapshot[k]) != bool(after[k])]
    step('every kill-switch flag still matches the pre-run snapshot (the toggles were fully reverted)',
         not vanished and not drifted,
         f'vanished={vanished} drifted={drifted} '
         f'before={{{", ".join(f"{k}:{snapshot[k]}" for k in FLAGS if k in snapshot)}}} '
         f'after={{{", ".join(f"{k}:{after[k]}" for k in FLAGS if k in after)}}}')


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
