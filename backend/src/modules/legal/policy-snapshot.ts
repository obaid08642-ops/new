import { createHash } from 'crypto';

const sha = (t: unknown) => createHash('sha256').update(String(t ?? '')).digest('hex');

/** The immutable copy of one policy version (`legal_policy_snapshots`): both languages of the text and the hash of each. */
export function policySnapshotDoc(policy: any) {
  return {
    key: policy.key,
    version: policy.version,
    title_ar: policy.title_ar ?? null,
    title_en: policy.title_en ?? null,
    content_ar: policy.content_ar ?? '',
    content_en: policy.content_en ?? '',
    content_sha256_ar: sha(policy.content_ar),
    content_sha256_en: sha(policy.content_en),
    effective_date: policy.effective_date ?? null,
    createdAt: new Date(),
  };
}
