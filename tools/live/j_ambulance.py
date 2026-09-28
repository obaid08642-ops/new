"""Journey: SOS, patient-app emergency/sos -> ambulance (provider-app AmbulanceDashboard) -> hospital handover -> completion.
Payloads copied from patient-app app/emergency/{sos,sos-active,tracking}.tsx and provider-app screens/ambulance/AmbulanceDashboard.tsx."""
import random
from lib import Client, journey, step

AMB_SCREEN_GETS = ['/provider/profile', '/provider/profile/availability', '/emergency/driver/missions', '/provider/dashboard/stats',
                   '/provider/ops/wallet/ledger', '/provider-onboarding/my-profile']


def fleet_setup(amb, admin):
    journey('SOS: ambulance registers a vehicle (FleetScreen), admin approves it')
    r = amb.post('/provider/ambulance/fleet', {'plate_number': f'ABC {random.randint(1000, 9999)}', 'model': 'Toyota Hiace', 'year': 2024, 'paramedic_count': 2,
                                               'has_icu': True, 'equipment': ['defibrillator', 'oxygen'], 'base_city': 'Riyadh'})
    vid = r.get('id')
    step('vehicle submitted for review', r.ok and vid, r)
    r = admin.get('/admin/admin/ambulance/fleet')
    step('admin fleet list shows it', r.ok and vid in str(r.body), r)
    r = admin.post(f'/admin/admin/ambulance/fleet/{vid}/approve', {})
    step('admin approves the vehicle', r.ok, r)
    r = amb.get('/provider/ambulance/fleet')
    step('the vehicle is approved on the ambulance side', r.ok and 'approved' in str(r.body), r)
    return vid


def run(pat, amb, hospital_id, admin=None):
    journey('SOS: patient raises an emergency')
    r = pat.post('/emergency/trigger', {'location': {'lat': 24.7136, 'lng': 46.6753}, 'type': 'ambulance'})
    eid = r.get('id')
    step('SOS sent (sos.tsx)', r.ok and eid, r)
    if not eid:
        return
    r = pat.get('/emergency/my/active')
    step('sos-active shows it', r.ok and eid in str(r.body), r)

    journey('SOS: an ambulance takes the mission')
    r = amb.get('/emergency/driver/missions')
    pool = [m.get('id') for m in (r.get('pool') or [])]
    mine = [m.get('id') for m in (r.get('mine') or [])]
    step('the mission reaches the ambulance (auto-dispatched to its unit, or in the open pool)', r.ok and (eid in mine or eid in pool), f'{r.status} pool={pool[:3]} mine={mine[:3]}')
    if eid in pool:
        r = amb.post(f'/emergency/{eid}/claim', {})
        step('ambulance claims it from the pool', r.ok, r)
    else:
        r = amb.get('/provider/notifications')
        step('the crew is notified of the dispatched mission', r.ok and eid in str(r.body), r)
        r = amb.post(f'/emergency/{eid}/claim', {})
        step('a second claim of an assigned mission is refused', r.status == 400, r)
    r = amb.post(f'/emergency/{eid}/track', {'lat': 24.70, 'lng': 46.66})
    step('live position sent', r.ok, r)
    r = amb.get(f'/provider/ops/ambulance/{eid}/eta?lat=24.70&lng=46.66')
    step('ETA computed', r.ok, r)
    r = pat.get('/emergency/tracking')
    step('patient tracking shows the ambulance', r.ok, r)
    r = amb.post(f'/provider/ops/ambulance/{eid}/handover', {'hospital_provider_account_id': hospital_id, 'notes': 'المريض واعٍ، ضغط مستقر'})
    step('handover to an approved hospital', r.ok and r.get('state') == 'HANDED_OVER', r)
    r = amb.post(f'/provider/ops/ambulance/{eid}/complete', {'summary': 'نقل آمن للمستشفى', 'outcome': 'transported', 'vitals': {'bp': '120/80', 'hr': '88', 'spo2': '97'}})
    step('mission completed with the report', r.ok, r)

    journey('SOS: afterwards')
    r = pat.get('/emergency/my/active')
    step('no active SOS left for the patient', r.ok and eid not in str(r.body), r)
    for path in AMB_SCREEN_GETS:
        r = amb.get(path)
        step(f'GET {path}', r.ok, r)
    r = amb.get('/emergency/driver/missions')
    step('the finished mission is in the ambulance history tab', r.ok and eid in str(r.get('history')), r)
    if admin:
        r = admin.get('/emergency/active')
        step('admin emergency console loads', r.ok, r)
    # off shift: the unit stops taking dispatches (keeps later runs deterministic too)
    for v in (amb.get('/provider/ambulance/fleet').items() or []):
        r = amb.patch(f"/provider/ambulance/fleet/{v['id']}", {'is_available': False})
        step('crew goes off shift (unit unavailable)', r.ok, r)
    journey('SOS: no free unit -> open pool -> crew on shift claims it -> patient cancels')
    r = pat.post('/emergency/trigger', {'location': {'lat': 24.7136, 'lng': 46.6753}, 'type': 'ambulance'})
    e2 = r.get('id')
    step('second SOS sent while every unit is off shift', r.ok and e2, r)
    vids = [v['id'] for v in (amb.get('/provider/ambulance/fleet').items() or [])]
    for v in vids:
        amb.patch(f'/provider/ambulance/fleet/{v}', {'is_available': True})
    r = amb.get('/emergency/driver/missions')
    step('the unassigned SOS waits in the open pool', r.ok and e2 in [m.get('id') for m in (r.get('pool') or [])], r)
    r = amb.post(f'/emergency/{e2}/claim', {})
    step('crew claims it (app sends no vehicle: its only unit is used)', r.ok and r.get('vehicle_id') in vids, r)
    r = amb.get('/emergency/driver/missions')
    step('it moves to my missions', r.ok and e2 in [m.get('id') for m in (r.get('mine') or [])], r)
    r = pat.get('/emergency/tracking')
    step('patient tracking shows a unit assigned', r.ok and any(x.get('key') == 'assigned' and x.get('done') for x in (r.get('steps') or [])), r)
    r = pat.post(f'/emergency/{e2}/cancel', {})
    step('patient cancels the SOS', r.ok, r)
    r = amb.get('/emergency/driver/missions')
    step('the cancelled mission leaves the crew list', r.ok and e2 not in str(r.get('mine')), r)
    for v in vids:
        amb.patch(f'/provider/ambulance/fleet/{v}', {'is_available': False})
    return eid


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    amb = j_onboarding.register_type('ambulance')
    j_onboarding.admin_review(admin, amb)
    j_onboarding.provider_after_approval(amb)
    hosp = j_onboarding.register_type('hospital')
    j_onboarding.admin_review(admin, hosp)
    j_onboarding.provider_after_approval(hosp)
    hid = Client(hosp['token'], 'hospital').get('/provider/me').get('account', 'id')
    fleet_setup(Client(amb['token'], 'ambulance'), admin)
    pat = j_accounts.app_signup(label='sos-patient')
    run(Client(pat['token'], 'patient'), Client(amb['token'], 'ambulance'), hid, admin)
    summary()
