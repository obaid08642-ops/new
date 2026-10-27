"""Journey (QA D-01): doctor search filters, sort and "available today", API with MongoDB and read-back.
  - an approved doctor in Riyadh, clinic and video, publishes hours (j_consultation.doctor_publishes_hours);
  - GET /care/doctors?specialty= lists the doctor; ?city= keeps the doctor in Riyadh and drops it for another city;
  - ?service_type=video lists the doctor (video mode) and ?service_type=home drops it (no home mode);
  - ?sort=price_asc returns the results in ascending price order (every returned doctor, the whole list);
  - ?available_today=true lists the doctor only while the doctor has a free slot today (hours are published for tomorrow,
    so the doctor is not listed today; the check reads the server's answer, not an assumption);
  - MongoDB provider_profiles holds the city and the modes the search filtered on.
Filters are checked against the approved doctor; the whole list is checked for sort order."""
import subprocess
import json
from urllib.parse import quote

from lib import Client, journey, step


def mongo_one(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def items(r):
    return r.body if isinstance(r.body, list) else r.items()


def price_of(d):
    for k in ('price_clinic', 'price_online', 'price_home', 'price'):
        v = d.get(k)
        if isinstance(v, (int, float)):
            return float(v)
    return None


def main():
    import j_admin, j_onboarding, j_consultation
    from lib import summary
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant', 'consultation_modes': ['clinic', 'video']})
    doc = Client(p['token'], 'doctor')
    doc.post('/provider-onboarding/step2', {'location': {'lat': 24.7136, 'lng': 46.6753}, 'city': 'الرياض'})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doc = Client(p['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doc, admin, ('clinic', 'video'))
    profile_id = doc.get('/provider-onboarding/my-profile').get('id')
    row = mongo_one(f'db.provider_profiles.findOne({{id: "{profile_id}"}}, {{_id: 0, city: 1, consultation_modes: 1, specialty: 1}})')
    pat = Client(j_onboarding_patient_token(), 'patient')

    journey('doctor search D-01: the filters and sort the search applies')
    r = pat.get(f'/care/doctors?specialty={spec}&limit=50')
    base = items(r)
    hit = next((x for x in base if x.get('id') == profile_id), None)
    step('specialty search lists the approved doctor', r.ok and hit is not None, r.status)
    if hit and len(base) > 0:
        print(f'    sample item keys: {sorted(hit.keys())[:30]}')
    step('MongoDB: the doctor is in Riyadh with clinic and video', bool(row) and row.get('city') == 'الرياض' and set(row.get('consultation_modes') or []) >= {'clinic', 'video'}, row)

    r = pat.get(f'/care/doctors?specialty={spec}&city={quote('الرياض')}&limit=50')
    step('city filter keeps the doctor in Riyadh', r.ok and any(x.get('id') == profile_id for x in items(r)), r.status)
    r = pat.get(f'/care/doctors?specialty={spec}&city={quote('جدة')}&limit=50')
    step('city filter drops the doctor for another city', r.ok and not any(x.get('id') == profile_id for x in items(r)), r.status)

    r = pat.get(f'/care/doctors?specialty={spec}&service_type=video&limit=50')
    step('service filter (video) lists the doctor', r.ok and any(x.get('id') == profile_id for x in items(r)), r.status)
    r = pat.get(f'/care/doctors?specialty={spec}&service_type=home&limit=50')
    step('service filter (home) drops the doctor (no home mode)', r.ok and not any(x.get('id') == profile_id for x in items(r)), r.status)

    r = pat.get(f'/care/doctors?specialty={spec}&sort=price_asc&limit=50')
    prices = [price_of(x) for x in items(r)]
    known = [v for v in prices if v is not None]
    step('sort price_asc: every returned doctor carries a price', r.ok and len(known) == len(prices) and len(prices) > 0, f'{len(known)}/{len(prices)} priced')
    step('sort price_asc: the list is in ascending price order', r.ok and known == sorted(known), known[:6])

    r = pat.get(f'/care/doctors?specialty={spec}&available_today=true&limit=50')
    step('available today: the server answers (200)', r.ok, r.status)
    step('available today: the doctor is not listed while no slot is free today', not any(x.get('id') == profile_id for x in items(r)), r.status)
    summary()


def j_onboarding_patient_token():
    import j_accounts
    return j_accounts.app_signup(label='d01-search')['token']


if __name__ == '__main__':
    main()
