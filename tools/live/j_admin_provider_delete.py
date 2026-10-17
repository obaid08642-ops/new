"""Journey: deleting a provider from the admin deletes everything the provider owns (issue 1541).
  Case 1, a provider with an account: a doctor registers with a photo (POST /storage/upload to the S3 store), gets
  approved, opens clinic hours and a consultation session (admin approves both), leaves one change pending, goes
  online and is found by the site search; a patient books and pays one visit. The admin deletes the user through
  the admin panel (DELETE /api/admin/admin/users/:id, the users-management page's call). Then, read straight from
  the test database: no row of that provider is left in any of its collections; the photo answers 404 (public route
  and the object in the bucket); the search no longer finds it; the visit, its payment and ledger rows are still there.
  Case 2, a profile with no account (as the production doctor "د. اختبار ساندبوكس"): a second approved doctor loses its
  user and provider-app account rows (written to the TEST database only, the state production was in); the admin
  finds it in the "profiles without an account" list and deletes it (DELETE /api/admin/admin/provider-profiles/:id).
  Search: the gate runs without Meilisearch (no MEILI_URL), so the removal is proven through the backend's own
  search (GET /search, answered from the search_index collection) and the index rows; the Meilisearch call is
  covered by backend/src/modules/admin/provider-erasure.service.spec.ts.
  Stack: backend :8002 (DB_NAME from the queue), admin :3001, moto S3 :9000.
"""
import json
import os
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

from lib import Client, journey, step

API = os.environ.get('NABD_API', 'http://127.0.0.1:8002/api/v1')
S3 = os.environ.get('S3_ENDPOINT', 'http://127.0.0.1:9000')
BUCKET = os.environ.get('S3_BUCKET', 'nabd-live')
DB = os.environ.get('DB_NAME') or 'nabd_live'  # start-backend.sh's default: CI does not export DB_NAME

# Every collection a provider owns and the fields that name it (backend PROVIDER_OWNED_COLLECTIONS).
OWNED = {
    'provider_profiles': ['id', 'user_id', 'account_id'],
    'provider_accounts': ['id', 'user_id'],
    'provider_capabilities_pharmacy': ['provider_account_id'],
    'provider_capabilities_lab': ['provider_account_id'],
    'provider_capabilities_radiology': ['provider_account_id'],
    'provider_capabilities_doctor_sessions': ['provider_account_id'],
    'provider_capabilities_home_care': ['provider_account_id'],
    'provider_delivery_zones': ['provider_account_id'],
    'pharmacy_inventory': ['pharmacy_id'],
    'provider_schedule_slots': ['provider_account_id'],
    'provider_availability': ['provider_account_id'],
    'provideravailability': ['provider_id'],
    'provider_deltas': ['provider_id', 'provider_account_id'],
    'provider_settings': ['provider_id'],
    'provider_documents': ['account_id'],
    'provider_bank_accounts': ['account_id'],
    'storage_objects': ['owner_account_id'],
    'public_catalog_projections': ['entity_id'],
}
# Shared records that stay for audit.
KEPT = {
    'appointments': ['doctor_id', 'provider_id', 'provider_account_id'],
    'transactions': ['booking_id', 'reference_id', 'appointment_id'],
    'platformledgerentries': ['booking_id', 'reference_id', 'appointment_id', 'provider_id', 'provider_account_id'],
}


def mongo(js):
    """Evaluate in the local TEST database, JSON out."""
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', '--eval',
                          f'const d = db.getSiblingDB("{DB}"); print(EJSON.stringify(({js}), {{relaxed: true}}))'],
                         capture_output=True, text=True, timeout=60)
    try:
        return json.loads(out.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        return {'error': (out.stderr or out.stdout)[-300:]}


def counts(spec, ids):
    """{collection: rows naming any of ids}."""
    q = json.dumps({c: f for c, f in spec.items()})
    return mongo(f'Object.fromEntries(Object.entries({q}).map(([c, fs]) => [c, d.getCollection(c).countDocuments({{$or: fs.map((f) => ({{[f]: {{$in: {json.dumps(ids)}}}}}))}})]))')


def status(url):
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except OSError as e:
        return str(e)


def in_bucket(key):
    """Is the object in the S3 bucket? (moto lists the private bucket without credentials; a GET answers 403)."""
    try:
        with urllib.request.urlopen(f'{S3}/{BUCKET}?' + urllib.parse.urlencode({'prefix': key}), timeout=20) as r:
            return f'<Key>{key}</Key>' in r.read().decode('utf8', 'replace')
    except OSError as e:
        return str(e)


def found(name, profile_id):
    """Does the site search (doctors) list this profile for its name?"""
    r = Client().get('/search?' + urllib.parse.urlencode({'q': name, 'section': 'consultations', 'limit': '50'}))
    items = r.get('items') or []
    return r.ok and any(i.get('id') == profile_id for i in items), r


def wait_found(name, profile_id, want, secs=60):
    end = time.time() + secs
    while True:
        ok, r = found(name, profile_id)
        if ok == want or time.time() > end:
            return ok, r
        time.sleep(2)


def build_doctor(admin, label, with_visit):
    """An approved doctor with a photo, hours, a session, a pending change and a search entry; returns its ids."""
    import j_onboarding, j_consultation
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    d = j_onboarding.register_type('doctor', {'specialty': spec, 'consultation_modes': ['clinic']})
    wizard = Client(d['token'], 'doctor')
    journey(f'issue 1541 ({label}): the doctor adds a photo (S3 upload)')
    photo = j_onboarding.upload(wizard, 'doctor-photo.png')
    r = wizard.post('/provider-onboarding/step2', {'profile_photo': photo})
    step('the registration keeps the photo', r.ok, r)
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doctor = Client(d['token'], 'doctor')
    prof = doctor.get('/provider-onboarding/my-profile')
    pid = prof.get('id')
    step('the approved doctor has a public profile id', pid, prof)
    j_consultation.doctor_publishes_hours(doctor, admin)

    journey(f'issue 1541 ({label}): sessions, a pending change, online')
    r = doctor.post('/provider/capabilities/doctor-sessions', {'consultation_type': 'clinic', 'specialty': spec, 'price': 150, 'duration_minutes': 30})
    step('the doctor sends a consultation session for approval', r.ok and r.get('pending_review'), r)
    pend = [x for x in admin.get('/admin/admin/providers/provider-deltas').items() if x.get('status') == 'pending' and x.get('target') == 'capability']
    for x in pend:
        r = admin.post(f"/admin/admin/providers/provider-deltas/{x['id']}/approve", {'reason': 'جلسة معتمدة'})
        step('admin approves the session', r.ok, r)
    r = doctor.post('/provider/capabilities/doctor-sessions', {'consultation_type': 'video', 'specialty': spec, 'price': 120, 'duration_minutes': 20})
    step('a second session waits for review (a pending catalogue revision)', r.ok and r.get('pending_review'), r)
    r = doctor.post('/provider/availability', {'status': 'online'})
    step('the doctor goes online', r.ok, r)

    ids = mongo(f'''(() => {{
      const p = d.provider_profiles.findOne({{id: "{pid}"}});
      const u = d.users.findOne({{email: "{d['email']}"}});
      const a = d.provider_accounts.findOne({{email: "{d['email']}"}});
      const o = d.storage_objects.findOne({{id: "{photo}"}});
      return {{user: u && u.id, account: a && a.id, profile: p && p.id, name: p && (p.name_ar || p.display_name_ar || p.name_en), key: o && o.external_key}};
    }})()''')
    step('the doctor is in the database under its user, account and profile ids', ids.get('user') and ids.get('account') and ids.get('profile'), ids)
    all_ids = [i for i in (ids.get('user'), ids.get('account'), ids.get('profile')) if i]
    before = counts(OWNED, all_ids)
    want = ['provider_profiles', 'provider_accounts', 'provider_capabilities_doctor_sessions', 'provider_schedule_slots', 'provider_availability', 'provider_deltas', 'storage_objects']
    step('it owns a profile, an account, a session, hours, availability, a pending change and files', all((before.get(c) or 0) > 0 for c in want), before)
    ok, r = wait_found(ids.get('name') or '', pid, True)
    step('the site search finds the doctor', ok, r)
    step('the photo is served (public route)', status(f'{API}/care/doctors/{pid}/media/{photo}') in (200, 302), photo)
    step('the photo object is in the bucket', ids.get('key') and in_bucket(ids.get('key')) is True, ids.get('key'))

    visit = None
    if with_visit:
        import j_accounts
        pat = j_accounts.app_signup(label='provider-delete-patient')
        visit = j_consultation.book_paid(Client(pat['token'], 'patient'), doctor)
        step('a paid visit with this doctor exists', visit, visit)
    return {'doctor': doctor, 'photo': photo, 'pid': pid, 'ids': all_ids, 'name': ids.get('name') or '', 'key': ids.get('key'), 'visit': visit}


def assert_gone(label, doc):
    journey(f'issue 1541 ({label}): nothing of the provider is left')
    left = counts(OWNED, doc['ids'])
    step('every owned collection has 0 rows for the provider', isinstance(left, dict) and 'error' not in left and all(v == 0 for v in left.values()),
         {k: v for k, v in left.items() if v} or left)
    idx = mongo(f'd.search_index.countDocuments({{id: "{doc["pid"]}"}})')
    step('the search index has no document of the provider', idx == 0, idx)
    ok, r = wait_found(doc['name'], doc['pid'], False, secs=10)
    step('the site search no longer finds it', not ok, r)
    r = Client().get(f"/care/doctors/{doc['pid']}")
    step('the public doctor page answers 404', r.status == 404, r.status)
    st = status(f"{API}/care/doctors/{doc['pid']}/media/{doc['photo']}")
    step('the photo address answers 404', st == 404, st)
    gone = False
    for _ in range(10):  # the storage deleter runs right after the request answers
        gone = in_bucket(doc['key']) is False
        if gone:
            break
        time.sleep(1)
    step('the photo object is gone from the bucket', gone, doc['key'])


def main():
    import j_admin
    admin, _ = j_admin.login()

    one = build_doctor(admin, 'with account', with_visit=True)
    kept_before = counts(KEPT, one['ids'] + ([one['visit']] if one['visit'] else []))
    journey('issue 1541 (with account): the admin deletes the user from the admin panel')
    r = admin.delete(f"/admin/admin/users/{one['ids'][0]}")
    step('DELETE /admin/users/:id (users-management) succeeds', r.ok and r.get('message') == 'user_deleted_permanently', r)
    assert_gone('with account', one)
    kept_after = counts(KEPT, one['ids'] + ([one['visit']] if one['visit'] else []))
    step('the visit and its payment and ledger rows stay (audit)', kept_before.get('appointments', 0) > 0 and kept_after == kept_before, {'before': kept_before, 'after': kept_after})

    two = build_doctor(admin, 'no account', with_visit=False)
    journey('issue 1541 (no account): a profile whose account is gone')
    gone = mongo(f'''(() => {{
      const p = d.provider_profiles.findOne({{id: "{two['pid']}"}});
      return {{users: d.users.deleteMany({{id: p.user_id}}).deletedCount, accounts: d.provider_accounts.deleteMany({{$or: [{{id: p.account_id}}, {{user_id: p.user_id}}]}}).deletedCount}};
    }})()''')
    step('TEST database: the user and provider-app account rows are removed (the production state)', gone.get('users') == 1, gone)
    r = admin.get('/admin/admin/provider-profiles/orphans')
    listed = [i.get('id') for i in (r.get('items') or [])] if r.ok else []
    step('the admin lists it among the profiles without an account', two['pid'] in listed, r)
    r = admin.delete(f"/admin/admin/provider-profiles/{two['pid']}")
    step('DELETE /admin/provider-profiles/:id succeeds', r.ok and r.get('message') == 'provider_profile_deleted', r)
    assert_gone('no account', two)
    r = admin.get('/admin/admin/provider-profiles/orphans')
    step('and it leaves the list', r.ok and two['pid'] not in [i.get('id') for i in (r.get('items') or [])], r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
