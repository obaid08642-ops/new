/**
 * P14.28 (scale step 3): whether the Mongo driver connects straight to the one host in MONGO_URL or discovers a
 * replica set. Production today is one Mongo node addressed by its compose name (`mongodb:27017`), where a direct
 * connection is what has always run; a replica-set URL lists several hosts, which a direct connection refuses
 * outright ("directConnection option requires exactly one host") and which needs discovery to follow a failover.
 * MONGO_DIRECT_CONNECTION=true|false overrides the rule (e.g. false for a one-host seed of a replica set).
 */
export function mongoDirectConnection(uri: string | undefined, override: string | undefined = process.env.MONGO_DIRECT_CONNECTION): boolean {
  const o = String(override || '').trim().toLowerCase();
  if (o === 'true' || o === 'false') return o === 'true';
  const m = /^mongodb(\+srv)?:\/\/(?:[^@/]*@)?([^/?]*)/.exec(String(uri || ''));
  if (!m || m[1]) return !m; // mongodb+srv always discovers; an unreadable URI keeps the old behaviour
  return m[2].split(',').filter(Boolean).length <= 1;
}
