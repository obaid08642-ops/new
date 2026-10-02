"""Evidence-based coverage matrix: every inventoried screen/route joined with its latest test evidence.

  python3 tools/audit/coverage_matrix.py      -> docs/review/COVERAGE_MATRIX.md + docs/review/coverage_matrix.json

Inputs: docs/review/inventory/screens.json (tools/audit/screen_inventory.py) and the newest evidence per app:
  provider-app  docs/review/evidence/rn_nav2_provider-app_<type>_*.json   (crawler v2, per registered route)
  patient-app   docs/review/evidence/rn_web_patient-app_*.json            (route crawl)
  patient-web   docs/review/evidence/ui_form_fill_web_*.json + web_crawl_*.json
  admin         docs/review/evidence/ui_form_fill_admin_*.json + admin_crawl_*.json
Statuses: PASSED, FAILED, PARTIAL, NOT_TESTED, BLOCKED, STALE (file changed after the evidence), N/A.
A screen is PASSED only when it rendered without JS errors or failed reads AND every control it exposes produced an
observable, correct effect (navigate / UI change / stored write / guarded destructive). Rendering alone is never PASSED.
"""
import glob, json, os, re, subprocess, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EV = os.path.join(ROOT, 'docs/review/evidence')
GOOD = {'NAVIGATE', 'UI_CHANGE', 'BLOCKED_DESTRUCTIVE', 'SKIPPED_DESTRUCTIVE'}


def newest(pattern):
    fs = sorted(glob.glob(os.path.join(EV, pattern)), key=os.path.getmtime)
    return fs[-1] if fs else None


def changed_after(path, when):
    """True if `path` has a commit after `when` (evidence time) on the current checkout."""
    out = subprocess.run(['git', 'log', '-1', '--format=%ct', '--', path], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return bool(out) and int(out) > when


def element_verdict(els):
    if not els:
        return 'PARTIAL', 'no controls exercised'
    bad = [e for e in els if e['result'] in ('JS_ERROR', 'TAP_FAILED') or (e['result'] == 'WRITE' and (e.get('status', 0) >= 400 or (e.get('tokens_sent') and not e.get('tokens_stored'))))]
    unknown = [e for e in els if e['result'] in ('NO_EFFECT', 'CRAWLER_TARGET_MISSING', 'NOT_TESTED')]
    if bad:
        return 'FAILED', f"{len(bad)} failing control(s): " + ', '.join(f"{e['label'][:18]}={e['result']}" for e in bad[:3])
    if unknown:
        return 'PARTIAL', f"{len(unknown)}/{len(els)} control(s) without verified effect"
    return 'PASSED', f'{len(els)} controls verified'


def provider_rows(inv):
    rows = []
    reg = inv['provider-app']['registered_screens']
    by_file = {}
    for s in reg:
        by_file.setdefault(s['navigator_file'], []).append(s['name'])
    types = {'doctor': 'doctor/doctor/DoctorDashboardNavigator.tsx', 'hospital': 'facility/facility/FacilityDashboardNavigator.tsx',
             'lab': 'lab/LabDashboard.tsx', 'home_care': 'nursing/NursingDashboard.tsx', 'pharmacy': 'pharmacy/PharmacyDashboard.tsx',
             'radiology': 'radiology/RadiologyDashboard.tsx', 'ambulance': 'ambulance/AmbulanceDashboard.tsx'}
    for ptype, nav in types.items():
        names = next((v for k, v in by_file.items() if k.endswith(nav)), [])
        ev = newest(f'rn_nav2_provider-app_{ptype}_*.json')
        data = json.load(open(ev)) if ev else None
        for n in names:
            states = [s for s in (data or {}).get('screens', []) if s['route'] == n]
            if not data:
                rows.append(('provider-app', ptype, n, 'NOT_TESTED', 'no crawler v2 run yet', '')); continue
            if not states:
                rows.append(('provider-app', ptype, n, 'NOT_TESTED', 'not visited', os.path.basename(ev))); continue
            st = [s['status'] for s in states]
            if 'TESTED' in st:
                els = [e for s in states if s['status'] == 'TESTED' for e in s.get('elements', [])]
                render_bad = [s for s in states if s.get('render', {}).get('js') or s.get('render', {}).get('bad_reads')]
                v, why = element_verdict(els)
                if render_bad:
                    v, why = 'FAILED', 'render: ' + '; '.join((s['render']['js'] or s['render']['bad_reads'])[0][:70] for s in render_bad[:2])
                rows.append(('provider-app', ptype, n, v, f"{len(states)} state(s); {why}", os.path.basename(ev)))
            elif 'NEEDS_PARAMS' in st:
                rows.append(('provider-app', ptype, n, 'BLOCKED', 'needs a real record id (crashes when opened without one)', os.path.basename(ev)))
            else:
                rows.append(('provider-app', ptype, n, 'FAILED' if any(x in st for x in ('APP_JS_ERROR', 'APP_HTTP_ERROR', 'SLOW')) else 'NOT_TESTED',
                             ', '.join(sorted(set(st))) + ': ' + (states[0].get('reason') or '')[:70], os.path.basename(ev)))
    return rows


def patient_rows(inv):
    ev = newest('rn_web_patient-app_*.json')
    data = json.load(open(ev)) if ev else {'routes': []}
    when = int(os.path.getmtime(ev)) if ev else 0
    by_route = {r['route']: r for r in data.get('routes', [])}
    rows = []
    for s in inv['patient-app']:
        rel = os.path.relpath(os.path.join(ROOT, s['file']), os.path.join(ROOT, 'patient-app/app'))[:-4]
        r = by_route.get(rel)
        if s['dynamic'] and (not r or r.get('status') == 'NOT_TESTED_DYNAMIC'):
            rows.append(('patient-app', '', s['route'], 'NOT_TESTED', 'dynamic route: needs a real record id', os.path.basename(ev or ''))); continue
        if not r:
            rows.append(('patient-app', '', s['route'], 'NOT_TESTED', 'not in crawl', os.path.basename(ev or ''))); continue
        if changed_after(s['file'], when):
            rows.append(('patient-app', '', s['route'], 'STALE', 'screen file changed after the crawl', os.path.basename(ev))); continue
        render = r.get('render') or {}
        if render.get('js') or render.get('bad_reads'):
            rows.append(('patient-app', '', s['route'], 'FAILED', 'render: ' + str((render.get('js') or render.get('bad_reads'))[0])[:80], os.path.basename(ev))); continue
        v, why = element_verdict(r.get('elements') or [])
        rows.append(('patient-app', '', s['route'], v, why, os.path.basename(ev)))
    return rows


def page_rows(inv, app, key):
    crawl = newest(f'{key}_crawl_*.json')
    forms = newest(f'ui_form_fill_{"web" if app == "patient-web" else "admin"}_*.json')
    cdata = json.load(open(crawl)) if crawl else {'pages': []}
    fdata = json.load(open(forms)) if forms else []
    rows = []
    pages = inv[app]['pages']
    for p in pages:
        route = p['route']
        c = next((x for x in cdata.get('pages', []) if x.get('route') == route), None)
        f = [x for x in fdata if isinstance(x, dict) and re.sub(r'^/(ar|en)', '', x.get('page', '')) == re.sub(r'^/\[locale\]', '', route)]
        if p.get('dynamic') and not c:
            rows.append((app, '', route, 'NOT_TESTED', 'dynamic route: needs a real record id', '')); continue
        if not c and not f:
            rows.append((app, '', route, 'NOT_TESTED', 'no evidence', '')); continue
        if c:
            render = c.get('render') or {}
            if render.get('js') or render.get('bad_reads'):
                rows.append((app, '', route, 'FAILED', 'render: ' + str((render.get('js') or render.get('bad_reads'))[0])[:80], os.path.basename(crawl))); continue
            v, why = element_verdict(c.get('elements') or [])
        else:
            st = [x['status'] for x in f]
            v = 'PASSED' if st and all(x in ('SAVED', 'NO_SAVE_BUTTON') for x in st) and 'SAVED' in st else 'PARTIAL'
            why = 'forms: ' + ', '.join(sorted(set(st)))
        rows.append((app, '', route, v, why, os.path.basename(crawl or forms)))
    return rows


def main():
    inv = json.load(open(os.path.join(ROOT, 'docs/review/inventory/screens.json')))
    rows = provider_rows(inv) + patient_rows(inv) + page_rows(inv, 'patient-web', 'web') + page_rows(inv, 'admin', 'admin')
    totals = {}
    for app, _, _, st, _, _ in rows:
        totals.setdefault(app, {}).setdefault(st, 0)
        totals[app][st] += 1
    json.dump({'generated': datetime.datetime.now().isoformat(timespec='seconds'), 'commit': inv.get('_meta', {}).get('commit'),
               'totals': totals, 'rows': [dict(zip(['app', 'group', 'item', 'status', 'detail', 'evidence'], r)) for r in rows]},
              open(os.path.join(ROOT, 'docs/review/coverage_matrix.json'), 'w'), ensure_ascii=False, indent=1)
    lines = ['# Coverage matrix (generated)', '', f"Generated {datetime.date.today()} from `docs/review/inventory/screens.json` (commit {inv.get('_meta', {}).get('commit')}) and `docs/review/evidence/`.",
             'PASSED = rendered cleanly **and** every exposed control had a verified effect. Rendering alone is never PASSED.', '',
             '| App | ' + ' | '.join(['PASSED', 'PARTIAL', 'FAILED', 'NOT_TESTED', 'BLOCKED', 'STALE']) + ' | Total |', '|---|' + '---|' * 7]
    for app, t in totals.items():
        lines.append(f'| {app} | ' + ' | '.join(str(t.get(k, 0)) for k in ['PASSED', 'PARTIAL', 'FAILED', 'NOT_TESTED', 'BLOCKED', 'STALE']) + f' | {sum(t.values())} |')
    lines += ['', '| App | Group | Screen / route | Status | Detail | Evidence |', '|---|---|---|---|---|---|']
    lines += [f'| {a} | {g} | `{i}` | {s} | {d.replace("|", "/")} | {e} |' for a, g, i, s, d, e in rows]
    open(os.path.join(ROOT, 'docs/review/COVERAGE_MATRIX.md'), 'w').write('\n'.join(lines) + '\n')
    for app, t in totals.items():
        print(app, t)


if __name__ == '__main__':
    main()
