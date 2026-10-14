/**
 * Q11: the dose "✓" on /reminders posted without an idempotency key; the backend route is
 * @RequireIdempotency, so every log answered 400 and the page refreshed as if it had worked.
 */
export function reminderLogRequest(id: string, timeKey: string | undefined, key: string = crypto.randomUUID()): [string, RequestInit] {
  return [
    `/api/health/reminders/${encodeURIComponent(id)}/log`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify({ status: "taken", time_key: timeKey || "" }),
    },
  ];
}
