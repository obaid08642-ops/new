/**
 * Admin catalog publication. A lab test / scan / nursing service is shown to patients only when
 * medical_review_status is 'approved' (public_eligibility follows it). The admin catalog editor is the
 * review step, so setting the status there records who reviewed it and when.
 */
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;

export function reviewUpdate(status: unknown, adminId: string): Record<string, any> {
  if (!REVIEW_STATUSES.includes(status as any)) return {};
  return {
    medical_review_status: status,
    public_eligibility: status === 'approved',
    last_reviewed: new Date(),
    provenance: `admin_catalog:${adminId}`,
  };
}

/** Public catalog lists are cached (getWithSWR, key per query): drop every variant after an admin edit. */
export async function invalidateCatalogCache(redis: any, prefix: string): Promise<void> {
  if (!redis?.keys || !redis?.del) return;
  const keys: string[] = await redis.keys(`${prefix}*`).catch(() => []);
  for (const k of keys) await redis.del(k).catch(() => null);
}
