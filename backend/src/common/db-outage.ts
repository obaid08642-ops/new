/**
 * Shared cron guard: DB-outage errors (DNS/connection loss) must skip quietly
 * instead of spamming Sentry on every tick. Jobs stay pending and resume
 * when the database is back. Real bugs still throw and get reported.
 */
export function isDbOutageError(err: any): boolean {
  const msg = String(err?.message || err || '');
  const name = String(err?.name || '');
  return /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|MongoNotConnected|MongoServerSelectionError|MongoNetworkError|TopologyClosed|connection.*closed|Client must be connected/i.test(`${name} ${msg}`);
}
