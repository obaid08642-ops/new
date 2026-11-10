import { createHash } from 'crypto';
import { DEFAULT_REFUND_POLICY } from '../modules/refund-policy/refund-policy.defaults';
import { REFUND_POLICY_VERSION, type RefundPolicyAcceptance } from './refund-policy-acceptance';

/**
 * What a stored acceptance can prove: WHICH rule the patient agreed to. The tick is stored with the version and a hash of the refund policy IN FORCE for the service at that moment
 * (the stored admin policy, `system_configs {key:'refund_policy'}`, else the default table) and the service it was for. If the admin edits the table later, the stored hash no longer matches the
 * policy in force, and the version (the time the policy was last saved) says when it changed, so a dispute can show exactly which table the patient accepted.
 */
export type PolicyService = 'consultation' | 'lab' | 'radiology' | 'nursing' | 'pharmacy';

/** The part of the stored policy each service follows (the same fields the cancel listeners read). */
export const POLICY_SECTION: Record<PolicyService, 'consultation' | 'home_visit' | 'pharmacy'> = {
  consultation: 'consultation', lab: 'home_visit', radiology: 'home_visit', nursing: 'home_visit', pharmacy: 'pharmacy',
};

/** JSON with sorted keys: the same policy always gives the same text, whatever order the fields were stored in. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v === undefined ? null : v);
}

export interface PolicyStamp { version: string; hash: string; service: PolicyService }

/** The stamp of a policy for one service: `doc` is the `system_configs` row (value + updatedAt) or null for the default table. Pure. */
export function policyStamp(doc: { value?: any; updatedAt?: Date | string } | null | undefined, service: PolicyService): PolicyStamp {
  const value = doc?.value && typeof doc.value === 'object' ? doc.value : DEFAULT_REFUND_POLICY;
  const pick = (k: 'consultation' | 'home_visit' | 'pharmacy') => (value as any)[k] ?? (DEFAULT_REFUND_POLICY as any)[k];
  // lab, radiology and nursing follow the 2-hour table of the consultation (owner decision 2026-11-10) AND the home-visit rules (trip fee, patient absent): both are what the patient accepts
  const section = service === 'lab' || service === 'radiology' || service === 'nursing' ? { consultation: pick('consultation'), home_visit: pick('home_visit') } : pick(POLICY_SECTION[service]);
  const hash = createHash('sha256').update(canonicalJson({ service, section })).digest('hex');
  const saved = doc?.updatedAt ? new Date(doc.updatedAt) : null;
  const version = saved && Number.isFinite(saved.getTime()) ? saved.toISOString() : REFUND_POLICY_VERSION;
  return { version, hash, service };
}

type Db = { collection(name: string): { findOne(filter: any, options?: any): Promise<any> } };

/** The acceptance with the policy stamp of its service added (undefined stays undefined: an exempt actor or a missing tick stores nothing). A read problem keeps the plain acceptance: it never stops a booking. */
export async function stampAcceptance(db: Db | undefined | null, acceptance: RefundPolicyAcceptance | undefined, service: PolicyService): Promise<RefundPolicyAcceptance | undefined> {
  if (!acceptance) return acceptance;
  try {
    const doc = db ? await db.collection('system_configs').findOne({ key: 'refund_policy' }, { projection: { _id: 0, value: 1, updatedAt: 1 } }) : null;
    return { ...acceptance, ...policyStamp(doc, service) };
  } catch {
    return acceptance;
  }
}
