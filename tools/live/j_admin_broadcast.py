"""Journey (scenario AD-07, notifications broadcast): an admin broadcast reaches the audience it names, and only that audience.
admin/src/pages/admin/notification-center (BFF -> backend admin/notification-center), the worker that fans a campaign out, and the push log:
  1. the rules before anything is sent: a patient cannot broadcast; a wide audience needs `audience_confirmed`; an unknown segment, an unsafe
     deep link, a title over 140 characters and a time in the past are refused
  2. one user (`user:<id>`): the campaign is claimed once (targeted 1), the worker marks it sent (sent 1), the push log holds one row for that
     user with the title, the body and the campaign id, and none for another patient who also has a device registered
  3. a segment (`patients`): targeted equals the patient count of the segments screen, every patient with a device has a push log row, and a
     nurse with a device has none; sending the same campaign again is refused (already_sent)
The push gateway itself is outside the stack: the journey proves the delivery attempt per user (a log row exists whether the gateway accepts the
fake device token or not), not the phone. Stack: backend :8002, admin BFF :3001. TEST database only (db_raw.find_raw)."""
import time
import uuid

from lib import Client, journey, step, summary

BASE = '/admin/admin/notification-center'


def rows(body):
    if isinstance(body, list):
        return body
    if isinstance(body, dict):
        return body.get('data') or body.get('items') or []
    return []


def device(client):
    """The app registers its push token after sign-in (a fake Expo token: the journey never reaches a phone)."""
    r = client.post('/notifications/register-token', {'token': f'ExponentPushToken[live-bc-{uuid.uuid4().hex[:12]}]', 'provider': 'expo', 'platform': 'ios'})
    return r.ok


def find_campaign(admin, title):
    r = admin.get(f'{BASE}/campaigns?page=1&limit=100')
    return next((c for c in rows(r.body) if isinstance(c, dict) and c.get('title') == title), None)


def wait_campaign(admin, cid, timeout=75):
    """The worker claims a `sending` campaign every 10 seconds and marks it `sent` when its pages are queued."""
    end = time.time() + timeout
    c = {}
    while time.time() < end:
        c = admin.get(f'{BASE}/campaigns/{cid}').body
        c = c.get('data', c) if isinstance(c, dict) else {}
        if c.get('status') in ('sent', 'failed'):
            return c
        time.sleep(3)
    return c


def push_logs(title, timeout=60, want=1):
    """Push log rows of a campaign title (the push worker writes one per user with a device, accepted or not)."""
    import db_raw
    end = time.time() + timeout
    found = []
    while time.time() < end:
        found = db_raw.find_raw('pushlogs', {'title': title}, limit=500)
        if len(found) >= want:
            return found
        time.sleep(3)
    return found


def run(admin=None):
    import j_accounts, j_admin
    if admin is None:
        admin, _ = j_admin.login()
    target = j_accounts.app_signup(label='bc-target')
    other = j_accounts.app_signup(label='bc-other-patient')
    nurse = j_accounts.app_signup(role='nurse', label='bc-nurse')
    tid = (target.get('user') or {}).get('id')
    oid = (other.get('user') or {}).get('id')
    nid = (nurse.get('user') or {}).get('id')
    pat = Client(target['token'], 'patient')
    step('three accounts with a device each', bool(tid and oid and nid)
         and device(pat) and device(Client(other['token'], 'patient')) and device(Client(nurse['token'], 'nurse')), (tid, oid, nid))

    journey('broadcast: the rules before anything is sent (AD-07)')
    base = {'title': 'اختبار البث', 'body': 'نص الاختبار', 'segment': 'patients'}
    # the patient's own client talks to the backend directly: the same route without the admin panel's /admin prefix
    r = pat.post('/admin/notification-center/broadcasts', {**base, 'audience_confirmed': True})
    step('a patient cannot broadcast (401/403)', r.status in (401, 403), r)
    r = admin.post(f'{BASE}/broadcasts', base)
    step('a wide audience needs the admin\'s confirmation (audience_confirmed)', r.status == 400 and 'audience confirmation required' in str(r.body), r)
    r = admin.post(f'{BASE}/broadcasts', {**base, 'segment': 'role:nobody', 'audience_confirmed': True})
    step('an unknown segment is refused', r.status == 400 and 'unsupported notification segment' in str(r.body), r)
    r = admin.post(f'{BASE}/broadcasts', {**base, 'segment': f'user:{tid}', 'deep_link': {'route': '//evil.example/x'}})
    step('an unsafe deep link is refused', r.status == 400 and 'unsafe deep link route' in str(r.body), r)
    r = admin.post(f'{BASE}/broadcasts', {**base, 'segment': f'user:{tid}', 'title': 'س' * 141})
    step('a title over 140 characters is refused', r.status == 400, r)
    r = admin.post(f'{BASE}/broadcasts', {**base, 'segment': f'user:{tid}', 'scheduled_at': '2020-01-01T00:00:00Z'})
    step('a time in the past is refused', r.status == 400 and 'scheduled time' in str(r.body), r)

    journey('broadcast: one user receives it, nobody else does (AD-07)')
    title = 'بث لمستخدم واحد ' + uuid.uuid4().hex[:6]
    r = admin.post(f'{BASE}/broadcasts', {'title': title, 'body': 'رسالة خاصة بك', 'segment': f'user:{tid}', 'deep_link': {'route': '/notifications'}})
    step('the broadcast is claimed for one user', r.ok and r.get('status') == 'sending' and r.get('targeted') == 1, r)
    camp = find_campaign(admin, title)
    step('the campaign is listed with its segment', bool(camp) and camp.get('segment') == f'user:{tid}', camp)
    if camp:
        done = wait_campaign(admin, camp['id'])
        stats = done.get('stats') or {}
        step('the worker queued it: status sent, 1 targeted, 1 sent', done.get('status') == 'sent' and stats.get('targeted') == 1 and stats.get('sent') == 1, done)
    logs = push_logs(title)
    mine = [x for x in logs if x.get('user_id') == tid]
    step('the target\'s device was sent the title and the body, with the campaign id and the deep link',
         len(mine) == 1 and mine[0].get('body') == 'رسالة خاصة بك'
         and (mine[0].get('data') or {}).get('campaign_id') == (camp or {}).get('id') and (mine[0].get('data') or {}).get('screen') == '/notifications', logs)
    step('no other user was sent it', all(x.get('user_id') == tid for x in logs), [x.get('user_id') for x in logs])

    journey('broadcast: a segment reaches its members and not the other roles (AD-07)')
    r = admin.get(f'{BASE}/segments')
    patients = (r.body.get('data', r.body) if isinstance(r.body, dict) else {}).get('patients')
    step('the segments screen counts the patients', r.ok and isinstance(patients, int) and patients >= 2, r)
    title2 = 'بث لكل المرضى ' + uuid.uuid4().hex[:6]
    r = admin.post(f'{BASE}/broadcasts', {'title': title2, 'body': 'تنبيه عام للمرضى', 'segment': 'patients', 'audience_confirmed': True})
    step('the audience is the patient count of the segments screen', r.ok and r.get('status') == 'sending' and isinstance(patients, int) and r.get('targeted') >= patients, [r.body, patients])
    camp2 = find_campaign(admin, title2)
    if camp2:
        done = wait_campaign(admin, camp2['id'])
        stats = done.get('stats') or {}
        step('the worker queued it for every patient', done.get('status') == 'sent' and stats.get('sent') == stats.get('targeted') and (stats.get('targeted') or 0) >= 2, done)
        r = admin.post(f'{BASE}/campaigns/{camp2["id"]}/send', {})
        step('sending the same campaign again is refused (already_sent)', r.ok and r.get('ok') is False and 'already_' in str(r.get('reason')), r)
    logs2 = push_logs(title2, want=2)
    users = {x.get('user_id') for x in logs2}
    step('both patients with a device were sent it', {tid, oid} <= users, sorted(users))
    step('the nurse with a device was not (a patients-only audience)', nid not in users, sorted(users))
    summary()


if __name__ == '__main__':
    run()
