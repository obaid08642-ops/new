"""Journey (backend + patient-web BFF): the telehealth consent before the first online consultation, and the refund
policy and telehealth consent pages (issue 1549, D-38, owner decision 36).

  1. The admin publishes `telehealth_consent` and `refund_policy` from docs/legal (version 1.0), as the reviewer loads
     them on the server; an already published text is left as it is.
  2. A new patient books a first online (video) consultation: the backend and the website's booking route refuse it with
     telehealth_consent_required, and GET /legal/pending lists the consent.
  3. The patient accepts through the website's own route (POST /api/legal/accept/telehealth_consent, what the consent card
     on the booking form calls): the acceptance row holds the version, the time, the browser's device id and the platform.
  4. The same booking through the website now goes through, and the consent is no longer pending.
  5. GET /ar/refund-policy and /ar/telehealth-consent on the website answer 200 with the published text.
  Stack: backend :8002 (DB_NAME from the queue), admin BFF :3001, patient-web :3100. TEST database only (the row is read
  with mongosh in the local `mongo` container).
"""
import datetime
import json
import os
import subprocess
import uuid

from lib import Client, WebClient, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
POLICIES = (
    # key, docs/legal file, applies_to, requires_acceptance, title_ar, title_en
    ('telehealth_consent', '04_TELEHEALTH_CONSENT.ar.md', ['patient'], True, 'الموافقة على الاستشارة الطبية عن بُعد', 'Telehealth consent'),
    ('refund_policy', '05_CANCELLATION_REFUND.ar.md', ['all'], False, 'سياسة الإلغاء والاسترداد', 'Cancellation and refund policy'),
)


def legal_text(name):
    """The official text of docs/legal without its title and header lines (the version is the policy's own field)."""
    lines = open(os.path.join(ROOT, 'docs', 'legal', name), encoding='utf8').read().splitlines()
    body = [ln for ln in lines if not ln.startswith('# ') and not ln.startswith('**الإصدار:**')]
    return '\n'.join(body).strip() + '\n'


def probe(text):
    """A plain phrase of the text (no markdown or characters the page escapes) to find it on the rendered page."""
    import re
    for ln in text.splitlines():
        ln = re.sub(r'^(#+|\d+\.|[-*•])\s+', '', ln.strip())
        if len(ln) >= 24 and not re.search(r'[\[\]<>&"\'*_`|]', ln[:24]):
            return ln[:24]
    return text.strip()[:12]


def acceptance_rows(user_id):
    """TEST database only: the legal_acceptances rows of one user."""
    db = os.environ.get('DB_NAME') or 'nabd_live'  # start-backend.sh's default
    js = (f'JSON.stringify(db.getSiblingDB("{db}").legal_acceptances.find({{user_id: "{user_id}", policy_key: "telehealth_consent"}},'
          ' {_id: 0, version: 1, timestamp: 1, device: 1, platform: 1}).toArray())')
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', '--eval', js], capture_output=True, text=True, timeout=60)
    try:
        return json.loads(out.stdout.strip() or '[]')
    except ValueError:
        return [{'error': (out.stdout + out.stderr)[:300]}]


def publish_policies(admin):
    journey('telehealth consent: the admin publishes the texts of docs/legal (decision 36)')
    texts = {}
    for key, name, applies, required, ar, en in POLICIES:
        content = legal_text(name)
        texts[key] = content
        cur = Client().get(f'/legal/policy/{key}?lang=ar')
        if cur.ok and isinstance(cur.body, dict) and cur.body.get('content'):
            texts[key] = cur.body['content']
            step(f'{key} is already published (version {cur.body.get("version")})', True)
            continue
        r = admin.put(f'/admin/admin/legal/policy/{key}', {'title_ar': ar, 'title_en': en, 'version': '1.0', 'content_ar': content,
                                                          'requires_acceptance': required, 'applies_to': applies, 'change_note': 'docs/legal 1.0 (decision 36)'})
        step(f'admin publishes {key} 1.0', r.ok, r)
    return texts


def doctor_with_video_hours(admin):
    import j_consultation, j_onboarding
    specs = Client().get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    prov = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant', 'consultation_modes': ['video']})
    j_onboarding.admin_review(admin, prov)
    j_onboarding.provider_after_approval(prov)
    doctor = Client(prov['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin, ('video',))
    return doctor


def video_slots(pat, doctor):
    """The doctor's public id and tomorrow's free video slots, latest first."""
    import j_consultation
    profile_id = doctor.get('/provider-onboarding/my-profile').get('id')
    account_id = doctor.get('/provider/me').get('account', 'id')
    spec = doctor.get('/provider/profile').get('specialty') or 'cardiology'
    r = pat.get(f'/care/doctors?specialty={spec}&limit=50')
    docs = r.body if isinstance(r.body, list) else r.items()
    hit = next((x for x in docs if x.get('id') in (profile_id, account_id)), None)
    step('the patient finds the video doctor', hit, r.status)
    if not hit:
        return None, []
    did = hit.get('id')
    day = j_consultation.tomorrow().isoformat()
    r = pat.get(f'/care/doctors/{did}/slots?date={day}&service_type=video')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    starts = [s.get('start') or s.get('slot_start') for s in slots if isinstance(s, dict) and s.get('available', True)]
    starts = sorted([s for s in starts if s], reverse=True)
    step('the doctor has free video slots tomorrow', starts, r)
    return did, starts


def web_book(web, did, slot):
    """What components-next/booking-flow.tsx sends: hold the slot, then book through the website."""
    lock = web.post('/api/slot-locks/reserve', {'provider_id': did, 'slot_start': slot})
    body = {'doctor_id': did, 'service_type': 'video', 'slot_start': slot, 'payment_method': 'card'}
    if lock.ok and lock.get('id'):
        body['slot_lock_id'] = lock.get('id')
    return web.post('/api/appointments/book', body, headers={'idempotency-key': f'web-{uuid.uuid4()}'})


def main():
    import j_admin, j_accounts
    admin, _ = j_admin.login()
    texts = publish_policies(admin)
    doctor = doctor_with_video_hours(admin)
    acct = j_accounts.app_signup(label='telehealth-consent')
    pat = Client(acct['token'], 'patient')
    user_id = (acct.get('user') or {}).get('id') or pat.get('/users/me').get('id')
    did, starts = video_slots(pat, doctor)
    if not did or not starts:
        return

    journey('telehealth consent: the first online consultation is refused without it')
    r = pat.get('/legal/pending')
    pending = [p.get('key') for p in (r.body if isinstance(r.body, list) else r.items())]
    step('GET /legal/pending lists telehealth_consent for the new patient', r.ok and 'telehealth_consent' in pending, r)
    r = pat.post('/care/appointments', {'doctor_id': did, 'service_type': 'video', 'slot_start': starts[0], 'payment_method': 'card'})
    step('the backend refuses the video booking (telehealth_consent_required)', r.status == 400 and 'telehealth_consent_required' in str(r.body), r)

    web = WebClient(WEB, 'patient-web')
    r = web.post('/api/auth/login', {'identifier': acct['email'], 'password': acct['password']})
    step('the patient signs in on the website', r.ok, r)
    device = web.cookie('nabd_device')
    step('the website gave this browser a device id', device, [c.name for c in web.jar])
    r = web_book(web, did, starts[0])
    step('the website booking route passes the refusal on (400 telehealth_consent_required, the form then shows the consent)',
         r.status == 400 and 'telehealth_consent_required' in str(r.body), r)
    step('no acceptance is recorded yet', acceptance_rows(user_id) == [], acceptance_rows(user_id))

    journey('telehealth consent: the patient accepts it on the website')
    r = web.post('/api/legal/accept/telehealth_consent', {})
    step('POST /api/legal/accept/telehealth_consent accepts (the consent card)', r.ok and r.get('ok') is True and r.get('version'), r)
    version = str(r.get('version') or '')
    rows = acceptance_rows(user_id)
    row = rows[0] if len(rows) == 1 and isinstance(rows[0], dict) else {}
    step('one acceptance row with the current version', row.get('version') == version and version, rows)
    stamp = row.get('timestamp')
    try:
        when = datetime.datetime.fromisoformat(str(stamp).replace('Z', '+00:00'))
        recent = abs((datetime.datetime.now(datetime.timezone.utc) - when).total_seconds()) < 600
    except ValueError:
        recent = False
    step('the row holds the time of the acceptance', recent, stamp)
    step("the row holds this browser's device id", device and row.get('device') == device, row)
    step('the row holds the platform (web)', row.get('platform') == 'web', row)

    journey('telehealth consent: the booking goes through after the acceptance')
    r = web_book(web, did, starts[0])
    aid = r.get('id')
    step('the website books the video consultation', r.ok and aid, r)
    if aid:
        r = pat.get(f'/care/appointments/{aid}')
        step('the appointment is the online consultation', r.ok and r.get('service_type') == 'video', r)
    r = pat.get('/legal/pending')
    pending = [p.get('key') for p in (r.body if isinstance(r.body, list) else r.items())]
    step('telehealth_consent is no longer pending', r.ok and 'telehealth_consent' not in pending, r)
    r = web.post('/api/legal/accept/telehealth_consent', {})
    step('accepting again records no second row', r.ok and len(acceptance_rows(user_id)) == 1, acceptance_rows(user_id))
    r = web.post('/api/legal/accept/patient_terms', {})
    step('the website accepts no other policy key (404)', r.status == 404, r)

    journey('telehealth consent: the refund policy and telehealth consent pages')
    for key, path in (('refund_policy', '/ar/refund-policy'), ('telehealth_consent', '/ar/telehealth-consent')):
        r = WebClient(WEB).req('GET', path, headers={'accept': 'text/html'})
        heading = probe(texts[key])
        body = r.body if isinstance(r.body, str) else ''
        step(f'GET {path} answers 200 with the published text', r.status == 200 and heading in body, f'{r.status} looking for {heading!r}')
    r = WebClient(WEB).req('GET', '/en/telehealth-consent', headers={'accept': 'text/html'})
    step('GET /en/telehealth-consent answers 200 (the Arabic text, the /terms fallback while there is no English text)', r.status == 200, r.status)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
