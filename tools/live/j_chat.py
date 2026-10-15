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
    r = pat.post('/chat/threads/direct', {'other_user_id': str(uuid.uuid4())})
    step('a direct thread to a stranger is refused (LJ-06)', r.status == 403, r)
    me = pat.get('/auth/me')
    pid = ((me.body.get('data') or me.body) or {}).get('id') if isinstance(me.body, dict) else None
    step('patient id resolves for the direct-thread check', bool(pid), me.status)
    r = doctor.post('/chat/threads/direct', {'other_user_id': pid or str(uuid.uuid4())})
    step('a direct thread to the booked patient is allowed', r.status in (200, 201) and bool(pid), r)

    journey('chat: doctor answers from the appointment (PreVisitChatScreen)')
    r = doctor.get(f'/provider/chat/appointment/{aid}')
    step('doctor sees the patient message in the appointment chat', r.ok and r.get('thread_id') == tid and 'صياماً' in str(r.body), r)
    r = doctor.post('/provider/chat/send', {'appointment_id': aid, 'message': 'لا حاجة للصيام، أحضر تحاليلك السابقة'})
    step('doctor replies', r.ok, r)
    r = pat.get(f'/chat/threads/{tid}/messages')
    step('the patient sees the reply', r.ok and 'أحضر تحاليلك' in str(r.body), r)
    # The patient is told the doctor wrote (notifications.service onChatMessageTargeted; the "chat" switch).
    r = pat.get('/notifications?lang=en')
    told = [n for n in rows(r) if isinstance(n, dict) and n.get('title') == 'New message from your doctor'
            and ((n.get('action') or {}).get('route') if isinstance(n.get('action'), dict) else None) == f'/consultations/appointments/{aid}']
    step('the patient is notified of the doctor\'s reply, linked to the appointment', r.ok and len(told) >= 1, f'{len(told)} matching')
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
    # patient-web lib/web-push.ts (through the patient proxy): the key, then this browser's subscription
    r = pat.get('/push/web/vapid-key')
    step('the website can read the web push key', r.ok and 'public_key' in (r.body or {}), r)
    r = pat.post('/push/web/subscribe', {'endpoint': f'https://push.example.test/{uuid.uuid4()}', 'keys': {'p256dh': 'BPk', 'auth': 'au'}, 'user_agent': 'live-gate'},
                 headers={'Idempotency-Key': str(uuid.uuid4())})
    step('a browser subscription is saved', r.ok and r.get('ok') is True, r)

    journey('notifications: doctor bell')
    r = doctor.get('/provider/notifications')
    step('doctor notifications load', r.ok, r)
    step('the doctor was notified about the new booking', (r.get('total') or 0) > 0, r)
    r = doctor.post('/provider/notifications/read-all', {})
    step('doctor marks all read', r.ok and doctor.get('/provider/notifications').get('unread_count') == 0, r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_concurrency
    from lib import summary
    # The consultation chat opens once the doctor has finished the visit (ChatService.verifyCommunicationAllowed),
    # so the journey starts from a paid consultation the doctor finished, as the apps reach it.
    pat = Client(j_accounts.app_signup(label='chat-patient')['token'], 'patient')
    aid = j_concurrency.completed_consultation(pat)
    doctor = j_concurrency.DOCTOR_CLIENT
    admin = j_concurrency._ADMIN or j_admin.login()[0]
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    if aid and doctor:
        run(pat, doctor, Client(p['token'], 'doctor'), aid, doctor.get('/provider-onboarding/my-profile').get('id'))
    else:
        step('a finished consultation for the chat', False, 'see the failed booking/visit step above')
    summary()
