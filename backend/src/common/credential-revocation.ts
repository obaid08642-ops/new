/**
 * Credential-change revocation (P3.0a / P3.0b).
 *
 * users.password_hash is the single credential for BOTH the patient login and
 * the linked provider login, so any password change/reset must end every
 * session minted from it, in every store:
 *   - users.token_version            → outstanding patient/admin access tokens 401
 *   - Redis refresh:<jti> family     → patient refresh tokens can't mint new access
 *   - provider_accounts.token_version (linked by user_id or shared id)
 *                                     → outstanding provider access tokens 401
 *   - provider_sessions status=revoked → provider refresh tokens can't mint new access
 *
 * The caller then issues fresh tokens for the current device only.
 */

/** Minimal slice of a mongo Db (native driver or mongoose connection.db). */
export interface CollectionSource {
  collection(name: string): any;
}

export interface RevocationResult {
  refresh_sessions_revoked: number;
  provider_accounts: string[];
  provider_sessions_revoked: number;
}

/** Kill every Redis refresh session of a user. Returns how many were active. */
export async function revokeRedisRefreshSessions(redisClient: any, userId: string): Promise<number> {
  if (!redisClient || !userId) return 0;
  const jtis: string[] = (await redisClient.smembers(`refresh_user:${userId}`)) || [];
  if (jtis.length) await redisClient.del(...jtis.map((j) => `refresh:${j}`));
  await redisClient.del(`refresh_user:${userId}`);
  return jtis.length;
}

/**
 * Revoke all sessions derived from users.<userId>'s credential. Bumps the
 * users counter unless `bumpUser` is false (caller already $inc'ed it in the
 * same write as the new hash).
 */
export async function revokeAllCredentialSessions(
  db: CollectionSource,
  redisClient: any,
  userId: string,
  opts: { bumpUser?: boolean } = {},
): Promise<RevocationResult> {
  if (opts.bumpUser !== false) {
    await db.collection('users').updateOne({ id: userId }, { $inc: { token_version: 1 } });
  }
  const refreshRevoked = await revokeRedisRefreshSessions(redisClient, userId);

  const linkFilter = { $or: [{ user_id: userId }, { id: userId }] };
  const linked: any[] = await Promise.resolve(
    db.collection('provider_accounts').find(linkFilter, { projection: { id: 1 } }),
  ).then((c: any) => (typeof c?.toArray === 'function' ? c.toArray() : c)).catch(() => []);
  const accountIds: string[] = (Array.isArray(linked) ? linked : []).map((a) => a?.id).filter(Boolean);

  let providerSessionsRevoked = 0;
  if (accountIds.length) {
    await db.collection('provider_accounts').updateMany({ id: { $in: accountIds } }, { $inc: { token_version: 1 } });
    const r = await db.collection('provider_sessions').updateMany(
      { provider_account_id: { $in: accountIds }, status: 'active' },
      { $set: { status: 'revoked', revoked_reason: 'credential_changed', revoked_at: new Date() } },
    );
    providerSessionsRevoked = Number(r?.modifiedCount ?? 0);
  }
  return { refresh_sessions_revoked: refreshRevoked, provider_accounts: accountIds, provider_sessions_revoked: providerSessionsRevoked };
}
