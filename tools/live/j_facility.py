"""Journey: hospital (provider-app screens/facility/*): ambulance handover lands in the inbox, beds/admission/discharge,
staff sub-accounts, invitations, surgeries, resources, announcements, profile/pricing changes, and every tab's reads.
Payloads copied from FacilityDashboard.tsx, DischargeSummaryScreen, FacilityResourcesScreen, FacilityAnnouncementsScreen,
FacilityInvitationScreen, FacilityProfileConfigScreen."""
import datetime, random
from lib import Client, journey, step, uniq, phone

FACILITY_SCREEN_GETS = ['/facility/beds/wards', '/facility/beds/admissions', '/facility/inbox', '/facility/shifts', '/facility/shifts/attendance',
                        '/facility/surgeries/schedule', '/hospital/branches', '/hospital/staff', '/insurance/requests/provider/queue',
                        '/provider/facility/patients/active', '/provider/jobs/queue?status=active&kind=appointment&today=true',
                        '/provider/jobs/queue?status=incoming', '/provider/jobs/queue?status=active', '/provider/ops/wallet/ledger',
                        '/provider/stats/today', '/facility/announcements', '/provider/facility/audit-logs', '/facility/resources',
                        '/provider/leave-requests', '/provider/profile', '/provider/facility/calendar', '/chat/threads',
                        '/home-care/providers?availability=now', '/provider/notifications', '/provider/ambulance/fleet']


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def run(hosp, admin, patient_id=None, emergency_id=None, invitee_email=None, invitee=None):
    journey('hospital: every tab loads')
    for path in FACILITY_SCREEN_GETS:
        r = hosp.get(path)
        step(f'GET {path}', r.ok, r)

    if emergency_id:
        journey('hospital: the ambulance handover reaches the facility')
        r = hosp.get('/facility/inbox')
        notes = [n for n in rows(r) if n.get('kind') == 'ambulance_handover']
        step('handover notice in the facility inbox', r.ok and notes, r)
        if notes:
            r = hosp.post(f"/facility/inbox/{notes[0]['id']}/read", {})
            step('mark the notice read', r.ok, r)
            r = hosp.get('/facility/inbox')
            step('it shows as read', r.ok and any(n.get('id') == notes[0]['id'] and n.get('read') for n in rows(r)), r)

    journey('hospital: ward -> bed -> admission -> discharge summary')
    r = hosp.post('/facility/beds/wards', {'name': f'جناح الباطنة {random.randint(1, 999)}', 'total_beds': 4})
    step('create a ward with 4 beds', r.ok, r)
    r = hosp.get('/facility/beds/wards')
    wards = rows(r)
    step('ward listed', r.ok and wards, r)
    ward = wards[0] if wards else {}
    r = hosp.get(f"/facility/beds/wards/{ward.get('id')}/beds")
    beds = rows(r)
    free = [b for b in beds if str(b.get('status', 'available')).lower() in ('available', 'free', 'vacant')]
    step('the ward has free beds', r.ok and free, r)
    if free and patient_id:
        r = hosp.post('/facility/beds/admission', {'patient_id': patient_id, 'bed_id': free[0]['id']})
        adm = r.get('id')
        step('admit the patient to a bed', r.ok and adm, r)
        r = hosp.post('/facility/beds/admission', {'patient_id': patient_id, 'bed_id': free[0]['id']})
        step('the occupied bed cannot be given twice', not r.ok, r)
        r = hosp.get('/facility/beds/admissions')
        step('admission listed (discharge screen)', r.ok and adm in str(r.body), r)
        r = hosp.get('/provider/facility/patients/active')
        step('patient tracker shows the admitted patient', r.ok and patient_id in str(r.body), r)
        r = hosp.put(f'/facility/beds/discharge/{adm}', {'diagnosis': 'التهاب رئوي', 'medications': 'Amoxicillin 500mg', 'instructions': 'راحة ومراجعة بعد أسبوع'})
        step('discharge with a summary', r.ok, r)
        r = hosp.get(f"/facility/beds/wards/{ward.get('id')}/beds")
        step('the bed is free again', r.ok and any(b.get('id') == free[0]['id'] and str(b.get('status')).lower() in ('available', 'free', 'vacant') for b in rows(r)), r)

    journey('hospital: staff sub-account')
    email = f"{uniq('staff')}@nabd.test"
    temp = f'TempPass#{random.randint(1000, 9999)}'
    r = hosp.post('/hospital/staff', {'full_name': 'د. سارة العتيبي', 'name_ar': 'سارة العتيبي', 'name_en': 'Sara Alotaibi', 'phone': phone(),
                                      'email': email, 'password': temp, 'staff_role': 'doctor',
                                      'department': 'Internal Medicine', 'scfhs': f'SCFHS-{random.randint(100000, 999999)}', 'permissions': ['read', 'write']})
    sid = r.get('staff', '_id') or r.get('staff', 'id')
    step('create a doctor sub-account (with its own login)', r.ok and sid and r.get('login_available'), r)
    r = Client().post('/provider/auth/login', {'email': email, 'password': temp})
    step('the staff member signs in with the temporary password', r.ok, r)
    r = hosp.get('/hospital/staff')
    row = next((x for x in rows(r) if x.get('email') == email), {})
    step('staff list shows it with name, role and department', r.ok and row.get('full_name') and row.get('role') == 'doctor' and row.get('department'), r)

    journey('hospital: surgery booking')
    if patient_id and sid:
        at = (datetime.datetime.utcnow() + datetime.timedelta(days=2)).replace(microsecond=0).isoformat() + 'Z'
        r = hosp.post('/facility/surgeries/book', {'patient_id': patient_id, 'primary_surgeon_id': sid, 'ot_room_number': 'OR-1',
                                                   'scheduled_at': at, 'duration_mins': 90, 'assistants': []})
        step('book an operating room', r.ok, r)
        r = hosp.get('/facility/surgeries/schedule')
        step('the surgery is on the schedule', r.ok and 'OR-1' in str(r.body), r)
        r = hosp.post('/facility/surgeries/book', {'patient_id': patient_id, 'primary_surgeon_id': sid, 'ot_room_number': 'OR-1',
                                                   'scheduled_at': at, 'duration_mins': 90, 'assistants': []})
        step('the same room at the same time is refused', not r.ok, r)
    r = hosp.delete(f'/hospital/staff/{sid}')
    step('remove the sub-account', r.ok, r)
    r = hosp.get('/hospital/staff')
    step('it leaves the staff list', r.ok and email not in str(r.body), r)
    r = Client().post('/provider/auth/login', {'email': email, 'password': temp})
    step('the removed staff member can no longer sign in', r.status in (401, 403), r)

    journey('hospital: invitations, resources, announcements')
    r = hosp.post('/hospital/invitations', {'identifier': invitee_email or f"{uniq('doc')}@nabd.test", 'role': 'doctor',
                                            'permissions': {'pricing': True, 'schedule': True, 'insurance': True, 'vacation': True, 'availability': True,
                                                            'online_consultation': True, 'home_visit': True, 'catalog': True, 'read_stats': True, 'manage_wallet': False}})
    step('invite a registered doctor' if invitee_email else 'invite an unknown email -> 404 (screen: not registered)', r.ok if invitee_email else r.status == 404, r)
    if invitee:
        r = invitee.get('/hospital/invitations/inbox')
        inv = next((x for x in rows(r) if str(x.get('status')) == 'pending'), None)
        step('the doctor sees the invitation (FacilityInvitationsScreen)', r.ok and inv, r)
        if inv:
            r = invitee.post(f"/hospital/invitations/{inv.get('id') or inv.get('_id')}/respond", {'accept': True})
            step('the doctor accepts', r.ok, r)
            r = hosp.get('/hospital/invitations')
            step('the facility sees it accepted', r.ok and 'accepted' in str(r.body), r)
            r = hosp.get('/provider/facility/subaccounts')
            step('the doctor is now linked to the facility', r.ok and invitee_email in str(r.body), r)
    r = hosp.post('/facility/resources', {'name_ar': 'جهاز أشعة مقطعية', 'name_en': 'CT scanner', 'type': 'equipment'})
    rid = r.get('id')
    step('add a resource', r.ok and rid, r)
    r = hosp.put(f'/facility/resources/{rid}', {'status': 'maintenance'})
    step('change resource status', r.ok, r)
    r = hosp.get('/facility/resources')
    step('resource shows the new status', r.ok and 'maintenance' in str(r.body), r)
    r = hosp.post('/facility/announcements', {'text': 'اجتماع الأطباء الساعة 9 صباحاً'})
    step('publish an announcement', r.ok, r)
    r = hosp.get('/facility/announcements')
    step('announcement listed', r.ok and 'اجتماع الأطباء' in str(r.body), r)

    journey('hospital: profile and pricing changes go to admin review')
    r = hosp.patch('/provider/profile', {'description_ar': 'مستشفى عام بسعة 200 سرير', 'description_en': 'General hospital, 200 beds',
                                         'website': 'https://hospital.example.sa', 'social': {'whatsapp': '+966500000001'}, 'sub_specialties': []})
    step('profile edit submitted', r.ok, r)
    r = hosp.post('/provider/settings/delta', {'newData': {'icuDaily': 2500, 'icuHourly': 120, 'wardDaily': 900, 'surgPrice': 8000, 'erFee': 300, 'ambFee': 500}})
    step('pricing change submitted', r.ok, r)
    r = admin.get('/admin/admin/providers/provider-deltas')
    step('admin sees the pending hospital changes', r.ok and any(x.get('status') == 'pending' for x in r.items()), r)


def facility_calendar(hosp, doctor, pat, admin):
    """A patient books the linked doctor; the hospital sees it in the unified calendar and patient tracker,
    checks the patient in at reception, and the doctor can later leave the facility."""
    import j_consultation
    j_consultation.doctor_publishes_hours(doctor, admin)
    aid = j_consultation.book_paid(pat, doctor)
    if not aid:
        return
    journey('hospital: the linked doctor\'s appointment in the facility calendar')
    r = hosp.get('/provider/facility/calendar')
    ev = next((x for x in rows(r) if x.get('id') == aid), None)
    step('unified calendar lists the appointment with its time', r.ok and ev and ev.get('scheduled_at'), r)
    pid = doctor.get(f'/care/appointments/{aid}').get('patient_id')
    r = hosp.get('/provider/facility/patients/active')
    step('patient tracker lists the booked patient', r.ok and pid in str(r.body), r)
    if str((ev or {}).get('status')).upper() not in ('CONFIRMED',):
        r = hosp.patch(f'/care/appointments/{aid}/confirm', {})
        step('facility confirms (calendar Confirm)', r.ok, r)
    r = hosp.patch(f'/care/appointments/{aid}/check-in', {})
    step('reception checks the patient in (dashboard check-in)', r.ok, r)
    r = pat.get(f'/care/appointments/{aid}')
    step('patient sees CHECKED_IN', r.ok and str(r.get('status')).upper() == 'CHECKED_IN', r)
    journey('hospital: shifts for the linked doctor')
    did = doctor.get('/provider/me').get('account', 'id')
    today = datetime.date.today().strftime('%A')
    r = hosp.post('/facility/shifts', {'user_id': did, 'day_of_week': today, 'start_time': '08:00', 'end_time': '16:00', 'department_id': 'الباطنة'})
    shid = r.get('id')
    step('add a shift for the doctor (Add shift form)', r.ok and shid, r)
    r = hosp.post('/facility/shifts', {'user_id': pid, 'day_of_week': today, 'start_time': '08:00', 'end_time': '16:00'})
    step('a person outside the facility cannot be rostered', r.status == 400, r)
    r = hosp.post('/facility/shifts', {'user_id': did, 'day_of_week': today, 'start_time': '8am', 'end_time': '16:00'})
    step('a malformed time is refused', r.status == 400, r)
    r = hosp.get('/facility/shifts')
    sh = next((x for x in rows(r) if x.get('id') == shid), {})
    step('shift listed with the doctor name and hours', r.ok and sh.get('doctor') not in (None, '—') and sh.get('from') == '08:00', r)
    r = hosp.post(f'/facility/shifts/{shid}/substitute', {})
    step('request a substitute', r.ok, r)
    r = hosp.get('/facility/shifts')
    step('the shift shows it needs a substitute', r.ok and any(x.get('id') == shid and x.get('status') == 'substitute' for x in rows(r)), r)

    journey('hospital: staff attendance (LJ-01)')
    # The hospital onboards at (24.7, 46.7); check in ~15 m away, inside the radius.
    loc = {'lat': 24.7001, 'lng': 46.7001}
    r = doctor.post('/facility/shifts/attendance/check-in', loc)
    att_id = r.get('id')
    step('the linked doctor checks in for its facility (GPS)', r.ok and att_id, r)
    if not att_id:
        step('the attendance list shows the doctor present', False, r)
    else:
        r = doctor.get('/facility/shifts/attendance')
        step('the attendance list shows the doctor present', r.ok and att_id in str(r.body), r)
    r = doctor.post('/facility/shifts/attendance/check-in', loc)
    step('a second check-in while one is open is refused', r.status == 400, r)
    if att_id:
        r = doctor.post(f'/facility/shifts/attendance/check-out/{att_id}', {})
        step('the doctor checks out', r.ok, r)
        r = doctor.get('/facility/shifts/attendance')
        att_rows = r.body if isinstance(r.body, list) else r.items()
        row = next((x for x in att_rows if x.get('id') == att_id), {})
        step('the record closes (not open)', r.ok and row.get('open') is False, row or r.status)
    else:
        step('the doctor checks out', False, 'no attendance id')
        step('the record closes (not open)', False, 'no attendance id')

    journey('hospital: the linked doctor asks for leave, the facility decides')
    d1 = (datetime.date.today() + datetime.timedelta(days=10)).isoformat()
    d2 = (datetime.date.today() + datetime.timedelta(days=12)).isoformat()
    r = doctor.post('/provider/ops/doctor/leave', {'start_date': d1, 'end_date': d2, 'type': 'vacation', 'note': 'إجازة سنوية'})
    lid = r.get('leave', 'id')
    step('doctor requests leave (DoctorOpsScreens)', r.ok and r.get('leave', 'status') == 'pending_facility', r)
    r = doctor.get('/provider/ops/doctor/leave')
    step('doctor sees it awaiting facility approval', r.ok and any(x.get('id') == lid and x.get('status') == 'pending_facility' for x in rows(r)), r)
    r = hosp.get('/provider/leave-requests')
    step('it reaches the facility leave queue', r.ok and any(x.get('id') == lid and x.get('status') == 'pending' for x in rows(r)), r)
    r = hosp.post('/provider/leave-requests/action', {'id': lid, 'action': 'approved'})
    step('facility approves', r.ok, r)
    r = doctor.get('/provider/ops/doctor/leave')
    step('the doctor\'s leave is now active (blocks bookings)', r.ok and any(x.get('id') == lid and x.get('status') == 'active' for x in rows(r)), r)
    r = doctor.post('/provider/ops/doctor/leave', {'start_date': d2, 'end_date': d2, 'type': 'break'})
    l2 = r.get('leave', 'id')
    r = hosp.post('/provider/leave-requests/action', {'id': l2, 'action': 'rejected'})
    step('facility rejects a second request', r.ok, r)
    r = doctor.get('/provider/ops/doctor/leave')
    step('the rejected leave does not block bookings', r.ok and not any(x.get('id') == l2 for x in rows(r)), r)

    r = doctor.post('/hospital/leave-facility', {})
    step('doctor leaves the facility', r.ok, r)
    r = hosp.get('/provider/facility/subaccounts')
    step('the doctor is no longer linked', r.ok and doctor.get('/provider/me').get('account', 'id') not in str(r.body), r)
    r = hosp.patch(f'/care/appointments/{aid}/check-in', {})
    step('the facility can no longer act on that doctor\'s appointments', r.status in (400, 403), r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_ambulance
    from lib import summary
    admin, _ = j_admin.login()
    amb = j_onboarding.register_type('ambulance')
    j_onboarding.admin_review(admin, amb)
    j_onboarding.provider_after_approval(amb)
    hosp = j_onboarding.register_type('hospital')
    j_onboarding.admin_review(admin, hosp)
    j_onboarding.provider_after_approval(hosp)
    h = Client(hosp['token'], 'hospital')
    hid = h.get('/provider/me').get('account', 'id')
    pat = j_accounts.app_signup(label='hospital-patient')
    p = Client(pat['token'], 'patient')
    a = Client(amb['token'], 'ambulance')
    j_ambulance.fleet_setup(a, admin)
    eid = j_ambulance.run(p, a, hid, admin)
    pid = p.get('/users/me').get('id') or p.get('/auth/me').get('id')
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    doc = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
    j_onboarding.admin_review(admin, doc)
    j_onboarding.provider_after_approval(doc)
    dc = Client(doc['token'], 'doctor')
    run(h, admin, pid, eid, doc.get('email'), dc)
    facility_calendar(h, dc, Client(j_accounts.app_signup(label='clinic-patient')['token'], 'patient'), admin)
    summary()
