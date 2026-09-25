/**
 * P3.0b: users is the single source of truth for passwords.
 *
 * A provider account authenticates with the password_hash of its linked
 * users row; provider_accounts.password_hash is no longer read for login and
 * no longer written by reset/change. Link resolution order (same as the P2.1
 * link migration): users.id = account.user_id → users.id = account.id
 * (onboarding-created accounts share the id) → users.email = account.email.
 */
import type { CollectionSource } from '../../common/credential-revocation';

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;

export function isRealHash(h: unknown): h is string {
  return typeof h === 'string' && BCRYPT_RE.test(h);
}

export async function findLinkedUser(db: CollectionSource, account: any): Promise<any | null> {
  if (!account) return null;
  const users = db.collection('users');
  const one = async (filter: any) => (await Promise.resolve(users.findOne(filter)).catch(() => null)) || null;
  if (account.user_id) {
    const u = await one({ id: account.user_id });
    if (u) return u;
  }
  if (account.id) {
    const u = await one({ id: account.id });
    if (u) return u;
  }
  if (account.email) {
    const u = await one({ email: String(account.email).toLowerCase().trim() });
    if (u) return u;
  }
  return null;
}

export interface UnifyReport {
  total: number;
  same: number;
  differ_users_wins: number;
  account_hash_placeholder: number;
  backfill_user_from_account: number;
  no_usable_hash: number;
  link_backfilled: number;
  orphans: Array<{ id: string; email: string | null; status: string | null }>;
}

/**
 * Plan (dry-run) or apply the password unification.
 *   same                        — hashes already identical, nothing to do
 *   differ_users_wins           — both real, different → account := users hash
 *   account_hash_placeholder    — account had 'onboarding'/empty → account := users hash
 *   backfill_user_from_account  — users row has NO hash but the account has a real one:
 *                                 copy it to users, otherwise the provider is locked out
 *   no_usable_hash              — neither side has a real hash (must reset password)
 *   link_backfilled             — user resolved by id/email fallback: user_id written
 *   orphans                     — no users row found; listed, never invented
 */
export async function unifyProviderPasswords(db: CollectionSource, opts: { apply: boolean }): Promise<UnifyReport> {
  const report: UnifyReport = { total: 0, same: 0, differ_users_wins: 0, account_hash_placeholder: 0, backfill_user_from_account: 0, no_usable_hash: 0, link_backfilled: 0, orphans: [] };
  const cur = db.collection('provider_accounts').find({});
  const accounts: any[] = typeof cur?.toArray === 'function' ? await cur.toArray() : await cur;
  for (const acc of accounts || []) {
    report.total++;
    const user = await findLinkedUser(db, acc);
    if (!user) {
      report.orphans.push({ id: acc.id, email: acc.email || null, status: acc.status || null });
      continue;
    }
    const accountSet: Record<string, unknown> = {};
    if (acc.user_id !== user.id) { accountSet.user_id = user.id; report.link_backfilled++; }

    const userHash = user.password_hash;
    const accHash = acc.password_hash;
    if (isRealHash(userHash)) {
      if (userHash === accHash) report.same++;
      else {
        if (isRealHash(accHash)) report.differ_users_wins++;
        else report.account_hash_placeholder++;
        accountSet.password_hash = userHash;
      }
    } else if (isRealHash(accHash)) {
      report.backfill_user_from_account++;
      if (opts.apply) await db.collection('users').updateOne({ id: user.id }, { $set: { password_hash: accHash } });
    } else {
      report.no_usable_hash++;
    }
    if (opts.apply && Object.keys(accountSet).length) {
      await db.collection('provider_accounts').updateOne({ id: acc.id }, { $set: accountSet });
    }
  }
  return report;
}
