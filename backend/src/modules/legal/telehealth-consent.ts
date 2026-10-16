import { BadRequestException } from '@nestjs/common';

/** D-38 (owner decision 36): the policy a patient accepts before the first online consultation. */
export const TELEHEALTH_CONSENT_KEY = 'telehealth_consent';
export const TELEHEALTH_CONSENT_REQUIRED = 'telehealth_consent_required';

interface FindOne { findOne(filter: Record<string, unknown>): Promise<unknown> }
interface ConnectionLike { collection?: (name: string) => FindOne; db?: { collection?: (name: string) => FindOne } }

function collectionOf(connection: unknown, name: string): FindOne | null {
  try {
    const conn = connection as ConnectionLike | null | undefined;
    return conn?.collection?.(name) ?? conn?.db?.collection?.(name) ?? null;
  } catch {
    return null;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whether `userId` has accepted the current telehealth_consent. An acceptance holds for every minor version of the same
 * major version (D-36: a new major version asks again), the same rule GET /legal/pending applies. When the deployment
 * publishes no such policy (or it does not require acceptance), there is nothing to accept: true.
 */
export async function hasTelehealthConsent(connection: unknown, userId: string): Promise<boolean> {
  const policies = collectionOf(connection, 'legal_policies');
  const acceptances = collectionOf(connection, 'legal_acceptances');
  if (!policies || !acceptances) return true;
  const policy = (await policies.findOne({ key: TELEHEALTH_CONSENT_KEY })) as { version?: unknown; requires_acceptance?: boolean } | null;
  if (!policy || policy.requires_acceptance === false) return true;
  const version = String(policy.version ?? '1.0');
  const exact = await acceptances.findOne({ user_id: userId, policy_key: TELEHEALTH_CONSENT_KEY, version });
  if (exact) return true;
  const major = version.split('.')[0];
  const sameMajor = await acceptances.findOne({
    user_id: userId,
    policy_key: TELEHEALTH_CONSENT_KEY,
    version: { $regex: `^${escapeRegex(major)}(\\.|$)` },
  });
  return !!sameMajor;
}

/** Refuses (400 telehealth_consent_required) until `userId` has accepted the current telehealth_consent. */
export async function assertTelehealthConsent(connection: unknown, userId: string): Promise<void> {
  if (!(await hasTelehealthConsent(connection, userId))) throw new BadRequestException(TELEHEALTH_CONSENT_REQUIRED);
}
