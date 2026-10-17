/**
 * A home-care booking carries `address` as an object `{ address, city, district, lat, lng }` (patient app); older rows
 * and some screens hold a plain string. One reader for both, so a screen never calls string methods on an object
 * (the nurse's visit checklist did and crashed) or draws the object itself.
 */
export function addressLine(address: unknown): string {
  if (typeof address === 'string') return address;
  if (address && typeof address === 'object') {
    const a = address as { address?: unknown; street?: unknown; city?: unknown };
    if (typeof a.address === 'string' && a.address) return a.address;
    return [a.street, a.city].filter((x): x is string => typeof x === 'string' && x.length > 0).join('، ');
  }
  return '';
}

/** First part of the address line (before the Arabic comma), for compact rows. */
export const addressShort = (address: unknown): string => addressLine(address).split('،')[0].trim();

/** "42 yrs | Female" built only from what the booking carries; the nurse list used to invent "70 yrs | Male". */
export function patientMeta(order: { age?: unknown; gender?: unknown } | null | undefined, ar: boolean): string[] {
  const parts: string[] = [];
  const age = Number(order?.age);
  if (Number.isFinite(age) && age > 0) parts.push(`${age} ${ar ? 'سنة' : 'yrs'}`);
  const g = String(order?.gender ?? '').toLowerCase();
  if (g === 'male' || g === 'm' || g === 'ذكر') parts.push(ar ? 'ذكر' : 'Male');
  else if (g === 'female' || g === 'f' || g === 'أنثى') parts.push(ar ? 'أنثى' : 'Female');
  return parts;
}
