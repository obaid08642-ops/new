"""Journey (scenario PT-12, reviews and rating of a provider; moderation step of AD-02): only a patient who used the service
can rate it. Stars count at once; written text waits for an admin, is hidden from the public list until approved, and is
shown after the admin approves it.
  - a stranger (no visit) cannot rate the visit: 403
  - a score outside 1..5 is refused: 400
  - the patient's stars-only rating is stored as published (created)
  - the same visit can be rated again (updated, no duplicate)
  - a rating with written text is stored as pending; the public provider list does not show the text
  - the patient reads their own review with its status (pending)
  - the admin sees it in the pending queue and approves it; the public list then shows the text
  - AD-02 reject path: changed text goes back to pending, only an admin rejects (reason max 500), it leaves the queue, never reaches the public list, cannot be moderated twice and cannot be resubmitted unchanged
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
    import j_accounts, j_admin, j_concurrency
    pat = Client(j_accounts.app_signup(label='review-rating')['token'], 'patient')
    stranger = Client(j_accounts.app_signup(label='review-stranger')['token'], 'patient')
    aid = j_concurrency.completed_consultation(pat)
    step('a finished paid visit exists for the reviewer', bool(aid), aid)
    if not aid:
        return summary()
    appt = pat.get(f'/care/appointments/{aid}').body
    appt = appt.get('data', appt) if isinstance(appt, dict) else {}
    provider_id = appt.get('doctor_user_id')  # the id the server checks the reviewed provider against (ratings.module verifiedProvider)
    step('the visit names its doctor', bool(provider_id), provider_id)

    journey('reviews: only a patient who used the service can rate it (PT-12)')
    body = {'entity_type': 'appointment', 'entity_id': aid, 'provider_id': provider_id, 'score': 4}
    r = stranger.post('/ratings', body)
    step('a stranger cannot rate someone else\'s visit (403)', r.status == 403, r)
    r = pat.post('/ratings', {**body, 'score': 9})
    step('a score outside 1..5 is refused (400)', r.status == 400, r)

    journey('reviews: stars count at once, text waits for moderation (PT-12)')
    r = pat.post('/ratings', {**body, 'sub_ratings': {'doctor': 5, 'clinic': 4, 'waiting': 3}})
    step('the stars-only rating is stored (created)', r.ok and r.get('created') is True and r.get('status') == 'published', r)
    r = pat.post('/ratings', {**body, 'score': 5})
    step('the same visit is rated again without a duplicate (updated)', r.ok and r.get('updated') is True, r)
    text = 'تجربة ممتازة مع الطبيب ' + uuid.uuid4().hex[:6]
    r = pat.post('/ratings', {**body, 'score': 5, 'comment': text})
    step('a rating with written text is stored as pending', r.ok and r.get('status') == 'pending', r)
    r = Client(None, 'anon').get(f'/ratings/provider/{provider_id}')
    step('the public provider list does not show the pending text', r.ok and text not in str(r.body), r)
    r = pat.get(f'/ratings/mine/appointment/{aid}')
    step('the patient reads back their own review text (the status is not returned: docs/qa/findings/batch5-2026-11-07.md)', r.ok and text in str(r.body), r)

    journey('reviews: the admin approves the text and it is published (PT-12, AD-02)')
    admin, _ = j_admin.login()
    r = admin.get('/admin/admin/ratings/pending?limit=200')
    mine = [x for x in rows(r.body) if isinstance(x, dict) and text in str(x)]
    step('the admin pending queue lists the review', r.ok and len(mine) == 1, r)
    rid = (mine[0].get('id') or mine[0].get('_id')) if mine else None
    if rid:
        r = admin.post(f'/admin/admin/ratings/{rid}/approve', {})
        step('the admin approves the review', r.ok, r)
    r = Client(None, 'anon').get(f'/ratings/provider/{provider_id}')
    step('after approval the public list shows the text', r.ok and text in str(r.body), r)

    journey('reviews: the admin rejects a review, it never becomes public (AD-02 reject path)')
    bad = 'نص مرفوض ' + uuid.uuid4().hex[:6]
    r = pat.post('/ratings', {**body, 'score': 1, 'comment': bad})
    step('the patient changes the text: the review goes back to pending', r.ok and r.get('status') == 'pending', r)
    r = admin.get('/admin/admin/ratings/pending?limit=200')
    queued = [x for x in rows(r.body) if isinstance(x, dict) and bad in str(x.get('comment'))]
    step('the admin queue lists the new text once', r.ok and len(queued) == 1, r)
    bid = queued[0].get('id') if queued else None
    if bid:
        r = pat.post(f'/admin/ratings/{bid}/reject', {'reason': 'x'})   # the patient's client talks to the backend directly (no admin panel prefix)
        step('a patient cannot moderate (401/403)', r.status in (401, 403), r)
        r = admin.post(f'/admin/admin/ratings/{bid}/reject', {'reason': 'س' * 501})
        step('a rejection reason over 500 characters is refused (400)', r.status == 400, r)
        r = admin.post(f'/admin/admin/ratings/{bid}/reject', {'reason': 'محتوى مسيء'})
        step('the admin rejects it with a reason', r.ok and r.get('status') == 'rejected', r)
        r = admin.get('/admin/admin/ratings/pending?limit=200')
        step('it leaves the queue', r.ok and not any(isinstance(x, dict) and x.get('id') == bid for x in rows(r.body)), r.status)
        r = admin.post(f'/admin/admin/ratings/{bid}/reject', {'reason': 'مرة ثانية'})
        step('rejecting it again is refused (review_not_pending, 404)', r.status == 404, r)
        r = admin.post(f'/admin/admin/ratings/{bid}/approve', {})
        step('approving a rejected review is refused (404)', r.status == 404, r)
    r = Client(None, 'anon').get(f'/ratings/provider/{provider_id}')
    step('the public list does not show the rejected text', r.ok and bad not in str(r.body), r)
    r = pat.get(f'/ratings/mine/appointment/{aid}')
    step('the patient still reads their own text back', r.ok and bad in str(r.body), r)
    r = pat.post('/ratings', {**body, 'score': 1, 'comment': bad})
    step('sending the same text again does not put it back in the queue (stays rejected)', r.ok and r.get('status') == 'rejected', r)
    r = admin.get('/admin/admin/ratings/pending?limit=200')
    step('and the queue does not hold it', r.ok and not any(isinstance(x, dict) and bad in str(x.get('comment')) for x in rows(r.body)), r.status)
    j_concurrency.remove_published_doctor()
    summary()


if __name__ == '__main__':
    run()
