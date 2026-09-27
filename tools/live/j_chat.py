"""Journey: patient <-> doctor chat (patient-app consultations/chat-with-doctor.tsx, provider-app PreVisitChatScreen and
shared chats inbox), then notifications on both sides (patient-app notifications, provider-app bell)."""
import uuid
from lib import Client, journey, step


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def run(pat, doctor, other_doctor, aid, profile_id=None):
    journey('chat: patient opens the appointment conversation (target of LJ-06)')
    r = pat.post('/chat/threads/booking', {'booking_kind': 'consultation', 'booking_id': aid})
    tid = (r.body.get('data') or r.body).get('id') if isinstance(r.body, dict) else None
    step('booking thread for the appointment', r.ok and tid, r)
    r = pat.post(f'/chat/threads/{tid}/messages', {'body': 'دكتور، هل أحتاج صياماً قبل الموعد؟', 'type': 'text', 'client_message_id': str(uuid.uuid4())},
                 headers={'Idempotency-Key': str(uuid.uuid4())})
    step('patient sends a message', r.ok, r)
    r = other_doctor.post('/chat/threads/booking', {'booking_kind': 'consultation', 'booking_id': aid, 'provider_id': 'x'})
    step('an outsider cannot join the appointment conversation', r.status == 403, r)

    journey('chat: doctor answers from the appointment (PreVisitChatScreen)')
    r = doctor.get(f'/provider/chat/appointment/{aid}')
    step('doctor sees the patient message in the appointment chat', r.ok and r.get('thread_id') == tid and 'صياماً' in str(r.body), r)
    r = doctor.post('/provider/chat/send', {'appointment_id': aid, 'message': 'لا حاجة للصيام، أحضر تحاليلك السابقة'})
    step('doctor replies', r.ok, r)
    r = pat.get(f'/chat/threads/{tid}/messages')
    step('the patient sees the reply', r.ok and 'أحضر تحاليلك' in str(r.body), r)
    r = doctor.get('/chats/threads')
    step('the conversation is in the doctor chats inbox', r.ok and tid in str(r.body), r)
    r = other_doctor.get(f'/provider/chat/appointment/{aid}')
    step('another doctor cannot open this appointment chat', r.status in (403, 404), r)
    r = other_doctor.get(f'/chat/threads/{tid}/messages')
    step('another doctor cannot read the thread', r.status in (403, 404), r)

    journey('notifications: patient (notifications screen)')
    r = pat.get('/notifications')
    items = rows(r)
    step('patient notifications load', r.ok, r)
    step('the patient was notified about the booking/payment', len(items) > 0, f'{len(items)} items')
    if items:
        r = pat.post(f"/notifications/{items[0]['id']}/read", {})
        step('mark one read', r.ok, r)
    r = pat.post('/notifications/read-all', {})
    step('mark all read', r.ok, r)
    r = pat.post('/notifications/register-token', {'token': f'ExponentPushToken[{uuid.uuid4().hex[:22]}]', 'platform': 'ios'})
    step('push token registered', r.ok, r)

    journey('notifications: doctor bell')
    r = doctor.get('/provider/notifications')
    step('doctor notifications load', r.ok, r)
    step('the doctor was notified about the new booking', (r.get('total') or 0) > 0, r)
    r = doctor.post('/provider/notifications/read-all', {})
    step('doctor marks all read', r.ok and doctor.get('/provider/notifications').get('unread_count') == 0, r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_consultation
    from lib import summary
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    docs = []
    for _ in range(2):
        p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
        j_onboarding.admin_review(admin, p)
        j_onboarding.provider_after_approval(p)
        docs.append(Client(p['token'], 'doctor'))
    j_consultation.doctor_publishes_hours(docs[0], admin)
    pat = Client(j_accounts.app_signup(label='chat-patient')['token'], 'patient')
    aid = j_consultation.book_paid(pat, docs[0])
    run(pat, docs[0], docs[1], aid, docs[0].get('/provider-onboarding/my-profile').get('id'))
    summary()
