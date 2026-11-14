/**
 * M6 ordering context (place, payer, for whom) read from the profile: GET /users/me/addresses, GET /users/me/insurance and
 * GET /family/members. The pure part (parse + build the quote context) is here and tested; the hook is useOrderingContext.ts.
 * The Ord01 context bar reuses both.
 */
import { readAddresses, type SelectedAddress } from './selectedAddress';
import type { OrderingContextBody, OrderingMode, OrderingPayer } from './ordering';

export interface OrderingPolicy { company: string; cls: string }
export interface OrderingMember { id: string; name: string }
export interface ProfileContext { addresses: SelectedAddress[]; policy: OrderingPolicy | null; members: OrderingMember[] }
export interface ContextChoice { mode: OrderingMode; payer: OrderingPayer | null; memberId: string | null; staffGender: 'female' | 'male' | null }

type Raw = Record<string, unknown>;
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const unwrap = (res: unknown): unknown => {
  const r = res && typeof res === 'object' && !Array.isArray(res) ? (res as Raw) : null;
  return r && r.data !== undefined && r.data !== null ? r.data : res;
};

/** The saved policy (company and class); null when either is missing, because the quote needs both (backend `insurance_not_saved`). */
export function parsePolicy(res: unknown): OrderingPolicy | null {
  const p = unwrap(res);
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const r = p as Raw;
  const company = text(r.provider) ?? text(r.provider_name);
  const cls = text(r.class);
  return company && cls ? { company, cls } : null;
}

/** The family members the account can order for. The quote takes the member record `id`; a member without one cannot be ordered for. */
export function parseMembers(res: unknown): OrderingMember[] {
  const list = unwrap(res);
  const rows = Array.isArray(list) ? list : [];
  return rows.flatMap((row): OrderingMember[] => {
    const r = row && typeof row === 'object' ? (row as Raw) : null;
    const id = r ? text(r.id) : null;
    return r && id ? [{ id, name: text(r.display_name) ?? text(r.name) ?? id }] : [];
  });
}

/** The address a quote starts from: the default one with a map point, else the first with a map point. */
export function placeOf(addresses: SelectedAddress[]): SelectedAddress | null {
  const located = addresses.filter((a) => typeof a.lat === 'number' && typeof a.lng === 'number');
  return located.find((a) => a.is_default) ?? located[0] ?? null;
}

export interface BuiltContext { body: OrderingContextBody | null; place: SelectedAddress | null; payer: OrderingPayer; needs: 'place' | null }

/** The body of the quote context from the profile and the patient's choice; `needs: 'place'` when no saved address has a map point. */
export function buildContext(profile: ProfileContext, choice: ContextChoice): BuiltContext {
  const place = placeOf(profile.addresses);
  const wanted: OrderingPayer = choice.payer ?? (profile.policy ? 'insurance' : 'cash');
  const payer: OrderingPayer = wanted === 'insurance' && !profile.policy ? 'cash' : wanted;
  if (!place || typeof place.lat !== 'number' || typeof place.lng !== 'number') return { body: null, place, payer, needs: 'place' };
  const member = choice.memberId && profile.members.some((m) => m.id === choice.memberId) ? choice.memberId : null;
  return {
    place,
    payer,
    needs: null,
    body: { mode: choice.mode, lat: place.lat, lng: place.lng, payer, ...(member ? { family_member_id: member } : {}), ...(choice.staffGender ? { staff_gender: choice.staffGender } : {}) },
  };
}

export async function loadProfileContext(get: (path: string) => Promise<unknown>): Promise<ProfileContext> {
  const [addresses, insurance, family] = await Promise.allSettled([get('/users/me/addresses'), get('/users/me/insurance'), get('/family/members')]);
  // addresses are the one read the screen cannot go on without; the policy and the family are optional (404 = none saved)
  if (addresses.status === 'rejected') throw addresses.reason;
  return {
    addresses: readAddresses(addresses.value),
    policy: insurance.status === 'fulfilled' ? parsePolicy(insurance.value) : null,
    members: family.status === 'fulfilled' ? parseMembers(family.value) : [],
  };
}
