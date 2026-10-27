/**
 * "Order now" on one test or scan (owner review G4) SKIPS THE CART. It opens the lab choice (`/diagnostics/lab-comparison`) with that one item
 * (`single=1`, the item id and its name, the place and the payer the hub had); the choice, the time and the payment follow in the normal steps
 * from a draft made of that item. The cart is not read, added to or changed on the way, and booking leaves its lines as they are.
 */
import type { OrderingKind } from './ordering';

type Param = string | string[] | undefined;
const first = (v: Param): string | undefined => (Array.isArray(v) ? v[0] : v);

export type SingleOrderInput = { kind: OrderingKind; id: string; name: string; place?: 'home' | 'clinic'; payer?: 'cash' | 'insurance' };

/** The route of the one-item order. `place` home/clinic is the hub's switch (clinic = the lab or centre); omitted = the screen's own default. */
export function singleOrderRoute(i: SingleOrderInput): { pathname: '/diagnostics/lab-comparison'; params: Record<string, string> } {
  return {
    pathname: '/diagnostics/lab-comparison',
    params: { kind: i.kind, id: i.id, name: i.name, single: '1', ...(i.place ? { mode: i.place === 'home' ? 'home' : 'facility' } : {}), ...(i.payer ? { payer: i.payer } : {}) },
  };
}

/** True when the lab-choice screen was opened for one item that skips the cart (needs both the item id and `single=1`). */
export const isSingleOrder = (p: { id?: Param; single?: Param }): boolean => Boolean(first(p.id)) && first(p.single) === '1';

/** The cart lines to remove after a booking: none for a one-item order (the cart was never part of it), else the booked ids. */
export const cartIdsToClear = (draft: { single?: boolean }, bookedIds: readonly string[]): string[] => (draft.single ? [] : [...bookedIds]);
