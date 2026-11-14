# Runbook: Notification queue backing up

**Alerts:** `queue_failed` (more than 20 failed jobs in 15 minutes) and `queue_waiting` (more than 200 jobs waiting for over 10 minutes) — `backend/src/modules/observability/queue-backlog.ts`, evaluated by `slo-alerts.service.ts` once a minute on the API process.

**Queue:** BullMQ `notifications-delivery` (`notifications.module.ts`). The API enqueues; the worker role delivers (email, SMS, push). A failing job is retried with exponential backoff, then kept in the failed set.

## Diagnose
1. Which kind of failure: a failing channel (email, SMS, push) makes many jobs fail the same way. Look at the failed jobs' last error in the worker log (`module` = `notification-delivery`).
2. Waiting jobs that do not move mean the worker is down or stuck: check the worker process and its restarts before the queue itself.
3. A burst of failures right after a deploy points at a bad change in the delivery code: compare with the last deploy.
4. Counts are read live: `BullMQ` `getFailedCount` and `getWaitingCount` on `notifications-delivery` (the alert detail carries the numbers).

## Mitigate
- Channel down (the provider returns errors): pause the affected channel at its switch if one exists, and leave the jobs in the queue; retries continue once the provider recovers.
- Worker down or stuck: restart the worker. Waiting jobs are kept, so nothing is lost.
- Bad deploy: roll back to the last good release (see the safe-deploy runbook); the queue drains afterwards.
- Do not delete failed jobs to make the number drop: they are the record of what was not delivered. Retry them only after the cause is fixed.

## Verify
- The failed count stops growing and the waiting count falls below 200 within 10 minutes.
- The alert sends its "resolved" message once clear for three checks.
