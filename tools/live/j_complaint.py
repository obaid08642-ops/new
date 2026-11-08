"""Journey (scenario PT-14, complaint raised): a patient files a complaint through the feedback form. It is kept as a
COMPLAINT support request (not a suggestion), it reaches the admin support queue with the patient's words, and the patient
can read it back in their own requests. An empty complaint is refused.
  - POST /support/feedback {category: complaint} -> success with the id of what it filed
  - the patient's own requests list it with the complaint category
  - the admin support queue lists it with category complaint and the patient's words
  - an empty message is refused (400)
  Stack: backend :8002. TEST database only.
"""
import uuid

from lib import Client, journey, step, summary


def rows(body):
    if isinstance(body, list):
        return body
    if isinstance(body, dict):
        return body.get('data') or body.get('items') or []
    return []


def run():
    import j_accounts, j_admin
    pat = Client(j_accounts.app_signup(label='complaint')['token'], 'patient')
    admin, _ = j_admin.login()

    journey('complaint: the patient files a complaint (PT-14)')
    words = 'شكوى: تأخر الطبيب عن الموعد بأكثر من ساعة ' + uuid.uuid4().hex[:6]
    r = pat.post('/support/feedback', {'message': words, 'category': 'complaint'})
    fid = r.get('id') if isinstance(r.body, dict) else None
    step('the complaint is accepted and gets an id', r.ok and r.get('success') and bool(fid), r)

    journey('complaint: it is kept as a complaint, not a suggestion (PT-14)')
    r = pat.get('/support/requests/mine')
    mine = [x for x in rows(r.body) if isinstance(x, dict) and x.get('id') == fid]
    step('the patient sees the complaint in their requests', r.ok and len(mine) == 1, r)
    step('it is filed under the complaint category', bool(mine) and str(mine[0].get('category', '')).lower() == 'complaint', mine[:1])
    r = admin.get('/support/admin/requests')
    queued = [x for x in rows(r.body) if isinstance(x, dict) and x.get('id') == fid]
    step('the admin queue lists it with the complaint category', r.ok and len(queued) == 1 and str(queued[0].get('category', '')).lower() == 'complaint', r)
    step('the admin queue keeps the patient\'s words', bool(queued) and words in str(queued[0].get('message', '')), queued[:1])

    journey('complaint: an empty complaint is refused (PT-14)')
    r = pat.post('/support/feedback', {'message': '   ', 'category': 'complaint'})
    step('an empty complaint is refused (400)', r.status == 400, r)
    summary()


if __name__ == '__main__':
    run()
