"""Journey (scenario SY-03, dead-letter queue inspection): the admin can see the background notification queue and its
failed jobs, a failed job can be retried with a reason, a bulk retry needs a written reason, and a patient cannot see the
queue at all.
  - admin: GET /admin/admin/ops/queues lists the notifications-delivery queue with its counts (failed is a number)
  - admin: GET .../jobs?state=failed returns the failed jobs (data list, state echoed)
  - admin: an unknown state is refused (400)
  - admin: retrying an unknown job id is refused (404)
  - admin: bulk retry without a reason is refused (400); with a reason it reports attempted and retried counts
  - patient: the queue and its jobs are refused (403)
  Stack: backend :8002. TEST database only.
"""
from lib import Client, journey, step, summary


def run():
    import j_accounts, j_admin
    admin, _ = j_admin.login()
    pat = Client(j_accounts.app_signup(label='dead-letter-patient')['token'], 'patient')
    q = 'notifications-delivery'

    journey('dead-letter queue: the admin sees the queue and its counts (SY-03)')
    r = admin.get('/admin/admin/ops/queues')
    queues = (r.body or {}).get('queues') if isinstance(r.body, dict) else None
    row = next((x for x in (queues or []) if isinstance(x, dict) and x.get('name') == q), None)
    step('the queue list names the notifications queue with its counts', r.ok and row is not None and isinstance(row.get('failed'), int), r)

    journey('dead-letter queue: the failed jobs are listed (SY-03)')
    r = admin.get(f'/admin/admin/ops/queues/{q}/jobs?state=failed&start=0&end=19')
    step('the failed jobs list answers with a data list and the state', r.ok and isinstance(r.body, dict) and isinstance(r.body.get('data'), list) and r.body.get('state') == 'failed', r)
    r = admin.get(f'/admin/admin/ops/queues/{q}/jobs?state=not-a-state')
    step('an unknown job state is refused (400)', r.status == 400, r)

    journey('dead-letter queue: a retry is audited and needs a reason (SY-03)')
    r = admin.post(f'/admin/admin/ops/queues/{q}/jobs/999999999/retry', {'reason': 'qa: no such job'})
    step('retrying an unknown job id is refused (404)', r.status == 404, r)
    r = admin.post(f'/admin/admin/ops/queues/{q}/retry-failed', {'limit': 5})
    step('a bulk retry without a reason is refused (400)', r.status == 400, r)
    r = admin.post(f'/admin/admin/ops/queues/{q}/retry-failed', {'reason': 'qa dead-letter check', 'limit': 5})
    body = r.body if isinstance(r.body, dict) else {}
    step('a bulk retry with a reason reports attempted and retried counts', r.ok and isinstance(body.get('attempted'), int) and isinstance(body.get('retried'), int) and body.get('retried') <= body.get('attempted'), r)

    journey('dead-letter queue: a patient cannot see the queue (SY-03)')
    r = pat.get('/admin/ops/queues')  # the backend route; the admin client's /admin/admin prefix is its BFF
    step('a patient is refused the queue (403)', r.status in (401, 403), r)
    r = pat.get(f'/admin/ops/queues/{q}/jobs?state=failed')
    step('a patient is refused the failed jobs (403)', r.status in (401, 403), r)
    summary()


if __name__ == '__main__':
    run()
