"""Evidence-based coverage matrix: every inventoried screen/route joined with its latest test evidence.

  python3 tools/audit/coverage_matrix.py      -> docs/review/COVERAGE_MATRIX.md + docs/review/coverage_matrix.json

Inputs: docs/review/inventory/screens.json (tools/audit/screen_inventory.py) and the newest evidence per app:
  provider-app  docs/review/evidence/rn_nav2_provider-app_<type>_*.json   (crawler v2, per registered route)
  patient-app   docs/review/evidence/rn_web_patient-app_*.json            (route crawl)
  patient-web   docs/review/evidence/ui_form_fill_web_*.json + web_crawl_*.json
  admin         docs/review/evidence/ui_form_fill_admin_*.json + admin_crawl_*.json
Statuses: PASSED, FAILED, PARTIAL, NOT_TESTED, BLOCKED, STALE (file changed after the evidence), N/A.
Ordering: later evidence wins per route, by file mtime. Run it where the evidence was produced (or copy with `cp -p`);
a fresh git checkout gives every file the same mtime, so the committed COVERAGE_MATRIX.md is the reference.
A screen is PASSED only when it rendered without JS errors or failed reads AND every control it exposes produced an
observable, correct effect (navigate / UI change / stored write / guarded destructive). Rendering alone is never PASSED.
"""
import glob, json, os, re, subprocess, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EV = os.path.join(ROOT, 'docs/review/evidence')
# Manual triage for pages that rendered a not-found state because the QA data has no record to show
# (route -> {status, reason}); anything not listed stays FAILED.
_OV = os.path.join(ROOT, 'docs/review/coverage_overrides.json')
OVERRIDES = json.load(open(_OV)) if os.path.exists(_OV) else {}
GOOD = {'NAVIGATE', 'UI_CHANGE', 'BLOCKED_DESTRUCTIVE', 'SKIPPED_DESTRUCTIVE', 'DISABLED'}


def newest(pattern):
    fs = sorted(glob.glob(os.path.join(EV, pattern)), key=os.path.getmtime)
    return fs[-1] if fs else None


def merged(pattern, key):
    """All evidence files for an app, oldest first; a later run's entry for the same route replaces the earlier one
    (rechecks and dynamic-route runs complement the full crawl instead of hiding it)."""
    out, src = {}, {}
    for f in sorted(glob.glob(os.path.join(EV, pattern)), key=os.path.getmtime):
        d = json.load(open(f))
        rows = d.get(key) if isinstance(d, dict) else d
        for r in rows or []:
            k = r.get('route')
            if k:
                out[k] = r; src[k] = os.path.basename(f)
    return out, src


def changed_after(path, when):
    """True if `path` has a commit after `when` (evidence time) on the current checkout."""
    out = subprocess.run(['git', 'log', '-1', '--format=%ct', '--', path], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return bool(out) and int(out) > when


def element_verdict(els):
    # the website's presence beacon fires on its own; a control whose only "write" is the heartbeat had no effect
    els = [dict(e, result='NO_EFFECT') if e.get('result') == 'WRITE' and 'heartbeat' in str(e.get('url', '')) else e for e in els]
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
    when = int(os.path.getmtime(ev)) if ev else 0
    by_route, srcs = merged('rn_web_patient-app_*.json', 'routes')
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
        o = OVERRIDES.get('app:' + s['route'])
        if o and render.get('bad_reads') and not render.get('js'):
            rows.append(('patient-app', '', s['route'], o['status'], o['reason'] + ' — ' + str(render['bad_reads'][0])[:60], os.path.basename(ev))); continue
        if render.get('js') or render.get('bad_reads'):
            rows.append(('patient-app', '', s['route'], 'FAILED', 'render: ' + str((render.get('js') or render.get('bad_reads'))[0])[:80], os.path.basename(ev))); continue
        v, why = element_verdict(r.get('elements') or [])
        rows.append(('patient-app', '', s['route'], v, why, os.path.basename(ev)))
    return rows


def page_rows(inv, app, key):
    crawl = newest(f'{key}_crawl_*.json')
    forms = newest(f'ui_form_fill_{"web" if app == "patient-web" else "admin"}_*.json')
    pages_by_route, srcs = merged(f'{key}_crawl_*.json', 'pages')
    cdata = {'pages': list(pages_by_route.values())}
    # crash_sweep renders every static page and records a rendered not-found / unavailable state; it overrides crawl
    # evidence that is older than the sweep (crawls before 2026-10-02 19:00 could not see that state)
    sweep_f = newest(f'crash_sweep_{"website" if app == "patient-web" else "admin"}_*.json')
    sweep = {x['route']: x for x in json.load(open(sweep_f))['pages']} if sweep_f else {}
    sweep_t = os.path.getmtime(sweep_f) if sweep_f else 0
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
        url = route.replace('/[locale]', '/ar', 1) if app == 'patient-web' else route
        sw = sweep.get(url)
        if c and sw and sw.get('not_found') and not (c.get('render') or {}).get('not_found') and os.path.getmtime(os.path.join(EV, srcs[route])) < sweep_t:
            c = dict(c, render=dict(c.get('render') or {}, not_found=sw['not_found']), url=url)
        if c:
            render = c.get('render') or {}
            if render.get('bad_reads') and not render.get('js') and OVERRIDES.get(route, {}).get('bad_reads'):
                o = OVERRIDES[route]
                rows.append((app, '', route, o['status'], o['reason'] + ' — ' + str(render['bad_reads'][0])[:60], os.path.basename(crawl))); continue
            if render.get('js') or render.get('bad_reads'):
                rows.append((app, '', route, 'FAILED', 'render: ' + str((render.get('js') or render.get('bad_reads'))[0])[:80], os.path.basename(crawl))); continue
            if render.get('not_found'):
                o = OVERRIDES.get(route)
                rows.append((app, '', route, o['status'] if o else 'FAILED', (o['reason'] if o else 'renders its not-found state') + f" ({c.get('url', '')[:60]})", os.path.basename(crawl))); continue
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
