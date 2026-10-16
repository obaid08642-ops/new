"""Journey: nearest free doctor, a registered hospital's page, the nursing prescription flag, an article's full text
(needs-review 2-app#10, 2-web#10, 12-web#12, 4-app#3, 10-web#2).
  - GET /care/doctors with available_within and sort=distance + the patient's position: the free doctors come nearest
    first (they used to be ordered by time only, so the clients did not send the position).
  - A hospital that registers in the provider app is on the map by its profile id; its facility page
    (GET /entity-graph/related/facility/:id, website /facility/:id) now answers from the public profile.
  - The nursing catalogue says which services need the patient's prescription (requires_patient_medication: injections,
    IV); the app asks for it from that flag, not from words in the title.
  - An article's body is shown on the website as text; markup and scripts in it never reach the page.
  Stack: backend :8002, patient-web :3100.
"""
import os
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
HOME = (24.7136, 46.6753)


def doctor_at(admin, lat, lng):
    import j_onboarding, j_consultation
    d = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    c = Client(d['token'], 'doctor')
    r = c.post('/provider-onboarding/step2', {'location': {'lat': lat, 'lng': lng}})
    step('the doctor saves the clinic location', r.ok, r)
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doctor = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin, ('clinic',))
    return doctor.get('/provider-onboarding/my-profile').get('id')


def main():
    import j_admin, j_onboarding
    admin, _ = j_admin.login()
    anon = Client(None, 'anon')

    journey('2-app#10 / 2-web#10: available now with nearest')
    far = doctor_at(admin, 24.95, 46.95)
    near = doctor_at(admin, 24.714, 46.676)
    r = anon.get(f'/care/doctors?type=clinic&available_within=2880&sort=distance&lat={HOME[0]}&lng={HOME[1]}&limit=50')
    ids = [x.get('id') for x in r.items()]
    step('both doctors are free in the window', r.ok and near in ids and far in ids, ids[:10])
    if near in ids and far in ids:
        step('the nearer free doctor comes first', ids.index(near) < ids.index(far), ids[:10])
        row = next(x for x in r.items() if x.get('id') == near)
        step('with its distance', isinstance(row.get('distance_km'), (int, float)) and row['distance_km'] < 1, row.get('distance_km'))

    journey('12-web#12: a registered hospital opens from the map')
    h = j_onboarding.register_type('hospital')
    Client(h['token'], 'hospital').post('/provider-onboarding/step2', {'location': {'lat': 24.72, 'lng': 46.68}, 'city': 'الرياض'})
    j_onboarding.admin_review(admin, h)
    j_onboarding.provider_after_approval(h)
    hid = Client(h['token'], 'hospital').get('/provider-onboarding/my-profile').get('id')
    r = anon.get('/providers/map?type=hospital')
    rows = r.body if isinstance(r.body, list) else r.items()
    step('the hospital is on the map by its profile id', any(x.get('id') == hid for x in rows), [x.get('id') for x in rows][:5])
    r = anon.get(f'/entity-graph/related/facility/{hid}')
    ent = (r.body or {}).get('entity') if isinstance(r.body, dict) else None
    step('its facility page answers from the public profile', r.ok and ent and ent.get('id') == hid and ent.get('type') == 'hospital', r)
    r = anon.get('/entity-graph/related/facility/no-such-facility')
    step('an unknown facility is still not found', r.status == 404, r.status)

    journey('4-app#3: the catalogue says which nursing services need the prescription')
    import j_accounts
    patient = Client(j_accounts.app_signup(label='nursing-rx')['token'], 'patient')
    r = patient.get('/home-care/services?limit=200')
    # GET /home-care/services answers a list (the compat controller the app reads); {data: [...]} is read too
    svcs = r.body if isinstance(r.body, list) else (r.body.get('data', []) if isinstance(r.body, dict) else [])
    rx = [s for s in svcs if s.get('category') in ('injection', 'iv')]
    step('injections and IV need the patient prescription', rx and all(s.get('requires_patient_medication') is True for s in rx), [(s.get('name_ar'), s.get('requires_patient_medication')) for s in rx])
    step('vital signs do not', any(s.get('category') == 'vitals' and s.get('requires_patient_medication') is False for s in svcs), len(svcs))

    journey('10-web#2: the article text on the website, without its markup')
    tag = uuid.uuid4().hex[:6]
    body = (f'<h2>نوم صحي {tag}</h2><p>نم ثماني ساعات <strong>كل ليلة</strong>.</p><ul><li>أطفئ الشاشات</li></ul>'
            f'<script>window.__pwned_{tag}=1</script><p onclick="x()">اشرب الماء<img src=x onerror="window.__pwned_{tag}=2"></p>')
    r = admin.post('/admin/admin/articles', {'title_ar': f'مقال اختبار {tag}', 'title_en': f'Test article {tag}', 'excerpt_ar': 'ملخص', 'excerpt_en': 'Summary', 'body_ar': body, 'body_en': '<p>English body</p>', 'category': 'sleep'})
    art = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the admin writes an article (TEST data)', r.ok and art.get('id'), r)
    if not art.get('id'):
        return
    r = admin.post(f"/admin/admin/articles/{art['id']}/publish", {})
    step('and publishes it', r.ok, r)
    slug = (r.body.get('data', r.body) if isinstance(r.body, dict) else {}).get('slug') or art.get('slug')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    page = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844}).new_page()
    try:
        page.goto(f'{WEB}/ar/articles/{slug}', wait_until='load', timeout=60000)
        section = page.locator('section[aria-labelledby="article-body"]')  # SectionCard puts the id on its heading
        section.wait_for(timeout=30000)
        text = section.inner_text()
        step('the page shows the heading, paragraphs and list', f'نوم صحي {tag}' in text and 'نم ثماني ساعات كل ليلة.' in text and 'أطفئ الشاشات' in text and 'اشرب الماء' in text, text[:300])
        step('nothing in the body ran or stayed markup', page.evaluate(f'() => window.__pwned_{tag} === undefined') and section.locator('script, img, [onclick]').count() == 0, '')
        res = page.goto(f'{WEB}/ar/facility/{hid}', wait_until='load', timeout=60000)
        step('the website opens the hospital page from the map link (not a 404)', res is not None and res.status == 200, f'{res.status if res else None} {page.locator("main").first.inner_text()[:200]}')
    except Exception as e:
        step('web flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
