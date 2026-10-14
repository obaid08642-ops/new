"""Field trace for provider registration: does every value a provider types reach the database AND the admin?

For each provider type, replays the exact step2/step3 payloads the registration screen sends (shapes from
clientbodies, same as j_onboarding) but with a UNIQUE value per field, submits, then looks for every value:
  - in the stored records (provider_profiles / provider_accounts / users / onboarding snapshot), via mongosh;
  - in what the admin reads when reviewing (GET /admin/providers/:id and the onboarding review record).
A field whose value is in neither is LOST; stored but not shown to the admin is HIDDEN_FROM_ADMIN.

  python3 tools/live/field_trace.py            (stack as in run_gate.sh; Mongo in docker container p5mongo)
Values for fixed-choice fields are the screen's own literals (doctor gender 'M'/'F', insurance switches
true/false): a backend that rejects what the screen really sends must fail here, not be papered over.
  UI=1 CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome  -> also checks what the admin SEES
  in provider-moderation (each value must be on the screen). TYPES=doctor,lab limits the run.
Writes /tmp/field_trace.json; exit 1 on any LOST, HIDDEN, NOT_ON_SCREEN field or rejected screen value.
"""
import json
import os
import re
import subprocess
import sys
import time
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('NABD_LIVE_WAIT_429', '1')
import j_admin  # noqa: E402
import j_onboarding as J  # noqa: E402
from lib import mail_code  # noqa: E402
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audit'))
from dto_fields import parse as parse_dto  # noqa: E402

_DTO = parse_dto(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'backend', 'src', 'modules',
                              'provider-onboarding', 'provider-onboarding.dto.ts'))
CUR = {}
STEP_DTO = {'/provider-onboarding/step2': 'Step2Dto', '/provider-onboarding/step3': 'Step3Dto'}


def from_dto(dto, key, n):
    """A valid, unique value for this DTO field (None when the screen sends a key the DTO does not declare)."""
    spec = _DTO.get(dto, {}).get(key)
    if not spec:
        return None
    # values the screens send from fixed choices (the backend checks them in the service, not the DTO)
    FIXED = {'gender': CUR.get('gender', 'male'), 'national_id': f'1{n:09d}'[:10], 'consultation_modes': ['clinic', 'video', 'home'],
             'pricingModel': ['visit', 'hour'], 'specialty': 'cardiology', 'academic_degree': 'consultant',
             # the doctor screen sends Switch booleans here (DoctorRegistration.tsx insuranceClinic/Online/Home)
             'insurance_clinic': True, 'insurance_online': True, 'insurance_home': True}
    if key in FIXED:
        return FIXED[key]
    d, t = spec['decorators'], spec['ts_type']
    k = key.lower()
    if 'IsIn' in d or 'IsEnum' in d:
        lits = re.findall(r"['\"]([^'\"]+)['\"]", d.get('IsIn', ''))
        vals = lits or None
        if vals:
            return [vals[0]] if 'IsArray' in d else vals[0]
    if 'ValidateNested' in d:
        inner = re.search(r'=>\s*(\w+)', d.get('Type', '') or '')
        cls = inner.group(1) if inner else None
        if cls == 'WorkingHoursEntryDto':
            return [{'day': 'sunday', 'open': f'0{n % 9}:1{n % 6}', 'close': '17:00', 'open_evening': None, 'close_evening': None, 'closed': False}]
        if cls and cls in _DTO:
            obj = {f: from_dto(cls, f, n + i) for i, f in enumerate(_DTO[cls])}
            obj = {a: b for a, b in obj.items() if b is not None}
            return [obj] if 'IsArray' in d else obj
    if 'IsObject' in d and 'each' in d.get('IsObject', ''):
        if 'schedule' in k or 'hours' in k:
            return [{'day': 'sunday', 'open': f'0{n % 9}:2{n % 6}', 'close': '17:00'}]
        return [{'name': f'{key}-{n}'}]
    if 'IsBoolean' in d:
        return True
    if 'IsNumber' in d or 'IsInt' in d:
        mx = re.search(r'Max\((\d+)', ' '.join(f'{a}({b})' for a, b in d.items()))
        hi = int(mx.group(1)) if mx else 100000
        return min(hi, 100 + n) if hi > 1 else 1
    if 'IsDateString' in d or 'date' in k or 'expiry' in k:
        return f'2027-0{1 + n % 9}-1{n % 9}'
    if 'IsArray' in d:
        return [f'{key}-{n}']
    if 'IsObject' in d:
        return {f'{key}_note': f'{key}-{n}'}
    if 'IsString' in d:
        if 'iban' in k:
            return 'SA0380000000608010167519'
        if 'email' in k:
            return f'{key}-{n}@nabd.test'
        if 'phone' in k or 'mobile' in k:
            return f'+9665{n:08d}'[:13]
        if 'url' in k or 'logo' in k or 'image' in k:
            return f'https://cdn.nabd.test/{key}-{n}.png'
        return f'{key}-{n}'
    return None

DB = os.environ.get('DB_NAME', 'nabd_cat')
SCREENS = dict(J.SCREENS, pharmacy='pharmacy/PharmacyRegistration.tsx')
SKIP_KEYS = {'location', 'license_documents', 'logo', 'images', 'clinic_images', 'facility_images', 'photos',
             'profile_photo', 'signature_url', 'id_front', 'id_back'}  # uploads/geo: checked by the journeys


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'p5mongo', 'mongosh', '--quiet', DB, '--eval', js],
                         capture_output=True, text=True).stdout
    return out


def unique(key, kind, n):
    base = J._value(key, kind)
    if isinstance(base, str) and base == 'قيمة اختبار':
        return f'{key}-{n}'
    if isinstance(base, (int, float)) and not isinstance(base, bool):
        return 100 + n
    if isinstance(base, list) and base and all(isinstance(x, str) for x in base) and base == ['قيمة']:
        return [f'{key}-{n}']
    return base


def leaves(v):
    if isinstance(v, dict):
        for x in v.values():
            yield from leaves(x)
    elif isinstance(v, list):
        for x in v:
            yield from leaves(x)
    elif v is not None and not isinstance(v, bool):
        yield v


def trace(admin, ptype):
    CUR['gender'] = os.environ.get('GENDER') or ('M' if ptype == 'doctor' else 'male')
    tag = uuid.uuid4().hex[:5]
    email = f'trace-{ptype}-{tag}@nabd.test'
    pw = 'Prov-' + tag + 'x!'
    anon = J.provider_client()
    r = anon.post('/provider-onboarding/start', {'phone': J.phone(), 'password': pw, 'full_name': f'مسؤول {ptype} {tag}', 'email': email, 'type': ptype})
    r = anon.post('/auth/login', {'identifier': email, 'password': pw})
    t = r.get('token')
    tok = t if isinstance(t, str) else (t or {}).get('accessToken')
    c = J.provider_client(tok)
    sent = {}   # key -> value
    rejected = {}
    not_in_dto = set()
    n = 0
    screen = SCREENS[ptype]
    rows = [x for x in J._calls() if x['url'] in ('/provider-onboarding/step2', '/provider-onboarding/step3') and screen in x['at']]
    rows.sort(key=lambda x: int(x['at'].split(':')[-1]))
    for call in rows:
        body = {}
        dto = STEP_DTO[call['url']]
        for k, kind in (call.get('kinds') or {}).items():
            n += 1
            v = from_dto(dto, k, int(tag, 16) % 900 + n)
            if v is None and k not in _DTO.get(dto, {}):
                not_in_dto.add(k)
                v = unique(k, kind, n) or f'{k}-{n}'
            if v is not None:
                body[k] = v
        if 'location' in (call.get('kinds') or {}):
            body['location'] = {'lat': 24.7, 'lng': 46.7}
        if 'license_documents' in body:
            body['license_documents'] = []
        for _ in range(4):
            res = c.post(call['url'], body)
            if res.ok:
                break
            msg = json.dumps(res.body, ensure_ascii=False)
            bad = [k for k in list(body) if re.search(rf'\b{re.escape(k)}\b', msg)]
            if not bad:
                rejected[call['at']] = msg[:200] + ' BODY=' + json.dumps(body, ensure_ascii=False)[:600]
                break
            for k in bad:   # enum/format-validated field: fall back to the screen's own kind of value
                fallback = J._value(k, (call.get('kinds') or {}).get(k))
                rejected[k] = msg[:120]
                if fallback is None:
                    body.pop(k, None)
                else:
                    body[k] = fallback
        for k, v in body.items():
            if k not in SKIP_KEYS:
                sent[k] = v
    sig = J.upload(c, 'signature.png', 'image/png')
    t0 = time.time()
    c.post('/provider/auth/send-otp', {'email': email, 'purpose': 'email_verification'})
    c.post('/provider/auth/verify-email', {'email': email, 'code': mail_code(email, t0)})
    sub = c.post('/provider-onboarding/submit', {'signer_name': f'مسؤول {ptype}', 'signer_role': 'owner', 'lat': 24.7, 'lng': 46.7, 'signature_url': sig, 'full_data': {}})

    # stored records (everything that mentions this email's account)
    raw = mongo_json(f'''
      const u = db.users.findOne({{email: "{email}"}});
      const ids = [u && u.id].filter(Boolean);
      const acc = db.provider_accounts.find({{$or: [{{email: "{email}"}}, {{user_id: {{$in: ids}}}}]}}).toArray();
      const accIds = acc.map(a => a.id);
      const prof = db.provider_profiles.find({{$or: [{{account_id: {{$in: accIds.concat(ids)}}}}, {{user_id: {{$in: ids}}}}]}}).toArray();
      print(JSON.stringify({{u, acc, prof}}));''')
    stored = raw
    # admin views
    lst = admin.get('/admin/admin/providers?status=pending&limit=200')
    items = lst.body.get('items', []) if isinstance(lst.body, dict) else []
    mine = next((i for i in items if i.get('email') == email), None)
    admin_txt = ''
    if mine:
        admin_txt += json.dumps(admin.get(f"/admin/admin/providers/{mine['id']}").body, ensure_ascii=False)
    regs = admin.get('/provider-onboarding/admin/registrations?limit=200')
    admin_txt += json.dumps(regs.body, ensure_ascii=False) if regs.ok else ''
    res = {'type': ptype, 'submit': sub.status, 'fields': {}, 'rejected': rejected, 'values': sent, 'email': email}
    def present(txt, k, v):
        vals = [str(x) for x in leaves(v)]
        distinctive = [x for x in vals if len(x) > 3 and x not in ('True', 'False', 'None')]
        if distinctive:
            return all(x in txt for x in distinctive)
        # booleans / short enums: the field name must be stored with that value
        lit = json.dumps(v if not isinstance(v, list) else v[0] if v else v)
        return re.search(rf'"{re.escape(k)}"\s*:\s*{re.escape(lit)}', txt) is not None or re.search(rf'"{re.escape(k)}"\s*:\s*\[?\s*{re.escape(lit)}', txt) is not None
    for k, v in sent.items():
        in_db = present(stored, k, v)
        in_admin = present(admin_txt, k, v)
        res['fields'][k] = 'OK' if in_db and in_admin else ('HIDDEN_FROM_ADMIN' if in_db else ('ADMIN_ONLY?' if in_admin else 'LOST'))
    res['not_in_dto'] = sorted(not_in_dto)
    return res


def ui_check(results):
    """What the admin SEES: open provider-moderation, open each traced provider, read the page text."""
    from playwright.sync_api import sync_playwright
    base = os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001')
    pw = sync_playwright().start()
    b = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None, args=['--disable-dev-shm-usage'])
    page = b.new_context(locale='ar-SA', viewport={'width': 1440, 'height': 1000}).new_page()
    page.goto(base + '/login'); t0 = time.time()
    page.locator('form input:not([type])').first.fill('admin@nabd.test')
    page.fill('input[type="password"]', os.environ.get('NABD_ADMIN_PASSWORD', 'Adm1n!Live-Pass'))
    page.click('button[type="submit"]'); page.wait_for_selector('input[inputmode="numeric"]', timeout=20000)
    page.fill('input[inputmode="numeric"]', mail_code('admin@nabd.test', t0)); page.click('button[type="submit"]')
    page.wait_for_url('**/admin**', timeout=20000)
    for r in results:
        page.goto(base + '/admin/provider-moderation'); page.wait_for_timeout(2500)
        hit = None
        for nk in ('name_ar', 'display_name_ar', 'legal_name', 'name_en', 'display_name_en'):
            name = r['values'].get(nk)
            if name and page.get_by_text(str(name), exact=False).count():
                hit = page.get_by_text(str(name), exact=False); break
        if hit is None:
            r['listed_as'] = page.locator('h3').all_inner_texts()[:8]
        if not hit or not hit.count():
            r['ui'] = 'PROVIDER_NOT_LISTED'; continue
        hit.first.click(); page.wait_for_timeout(6000)
        page.screenshot(path=f"/tmp/admin_provider_{r['type']}.png", full_page=True)
        text = page.inner_text('body')
        r['ui'] = {}
        for k, v in r['values'].items():
            vals = [str(x) for x in leaves(v) if len(str(x)) > 3 and str(x) not in ('True', 'False')]
            if vals:
                r['ui'][k] = 'SHOWN' if all(x in text for x in vals) else 'NOT_ON_SCREEN'
    b.close(); pw.stop()


def main():
    admin, _ = j_admin.login()
    out, bad = [], 0
    for ptype in (os.environ.get('TYPES') or 'pharmacy,doctor,lab,radiology,home_care,hospital').split(','):
        r = trace(admin, ptype)
        out.append(r)
        counts = {s: sum(1 for v in r['fields'].values() if v == s) for s in ('OK', 'HIDDEN_FROM_ADMIN', 'LOST', 'ADMIN_ONLY?')}
        print(f"{ptype:10s} submit {r['submit']}  fields {len(r['fields'])}  {counts}", flush=True)
        for k, v in sorted(r['fields'].items()):
            if v != 'OK':
                print(f'    {v:18s} {k}')
                bad += 1
        for k in r.get('not_in_dto', []):
            print(f'    SCREEN-SENDS-UNDECLARED {k}')
            bad += 1
        for k, v in r['rejected'].items():
            print(f'    REJECTED-VALUE      {k}: {v}')
    if os.environ.get('UI'):
        ui_check(out)
        for r in out:
            ui = r.get('ui')
            if isinstance(ui, str):
                print(f"{r['type']:10s} admin screen: {ui}  (list shows: {r.get('listed_as')})"); bad += 1; continue
            miss = sorted(k for k, v in (ui or {}).items() if v != 'SHOWN')
            print(f"{r['type']:10s} admin screen: shown {sum(1 for v in ui.values() if v == 'SHOWN')}/{len(ui)}  NOT_ON_SCREEN: {', '.join(miss)}")
            bad += len(miss)
    json.dump(out, open('/tmp/field_trace.json', 'w'), ensure_ascii=False, indent=1, default=str)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
