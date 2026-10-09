import { OFFER_FILTERS, mapOffers, offersPath } from '../offersList';
import { buildRespondBody, canRespond, mapReturnDetail, returnErrorKey, RETURN_NOTE_MAX } from '../returnRespond';
import { PHARMACY_MENU } from '../PharmacyMore';

jest.mock('../../../context', () => ({
  useTheme: () => ({ theme: new Proxy({}, { get: () => 'transparent' }) }),
  useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k }),
  useAuth: () => ({ user: { isOnline: false } }),
  useToast: () => ({ show: jest.fn() }),
}));
jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe('My offers (P3)', () => {
  it('filters by the backend status values; All sends none', () => {
    expect(offersPath('all')).toBe('/provider/pharmacy/offers');
    expect(offersPath('not_chosen')).toBe('/provider/pharmacy/offers?status=not_chosen');
    expect(OFFER_FILTERS.map(f => f.key)).toEqual(['all', 'draft', 'sent', 'chosen', 'not_chosen', 'expired', 'cancelled']);
  });
  it('maps rows and never invents a status or total', () => {
    const rows = mapOffers([
      { id: 'o1', order_id: 'ord1', view_status: 'chosen', totals: { total: 120.5, currency: 'SAR' }, items_count: 3, quote_expires_at: '2026-10-10T00:00:00Z', allocation_id: 'al1' },
      { id: 'o2', order_id: 'ord2', view_status: 'weird', totals: null, items_count: 'x' },
      { order_id: 'no-id' },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ view: 'chosen', total: 120.5, itemsCount: 3, allocationId: 'al1' });
    expect(rows[1]).toMatchObject({ view: null, total: null, itemsCount: 0, allocationId: null });
    expect(mapOffers(undefined)).toEqual([]);
  });
  it('is reachable from the More menu', () => {
    expect(PHARMACY_MENU.flatMap(s => s.rows.map(r => r.route))).toContain('my_offers');
  });
});

describe('Returns respond (P7)', () => {
  it('builds the DTO body: note trimmed, capped, omitted when empty', () => {
    expect(buildRespondBody(true, '   ')).toEqual({ agree: true });
    expect(buildRespondBody(false, '  damaged box  ')).toEqual({ agree: false, note: 'damaged box' });
    expect(buildRespondBody(false, 'x'.repeat(900)).note).toHaveLength(RETURN_NOTE_MAX);
  });
  it('maps the detail with evidence urls and the saved answer', () => {
    const d = mapReturnDetail({ id: 'r1', order_id: 'ord1', status: 'processing', reason: 'damaged', amount: '40', attached_docs: ['https://cdn/x.jpg', 'media:abc', 7], pharmacy_response: null });
    expect(d).toMatchObject({ amount: 40, photos: ['https://cdn/x.jpg'], response: null });
    expect(canRespond(d!)).toBe(true);
    const answered = mapReturnDetail({ id: 'r1', status: 'processing', pharmacy_response: { agree: false, note: 'n' } });
    expect(canRespond(answered!)).toBe(false);
    expect(canRespond(mapReturnDetail({ id: 'r2', status: 'approved' })!)).toBe(false);
    expect(mapReturnDetail({})).toBeNull();
  });
  it('maps errors: 404 = not your return', () => {
    expect(returnErrorKey({ response: { status: 404, data: { message: 'Return request not found' } } })).toBe('not_yours');
    expect(returnErrorKey({ response: { status: 400, data: { message: 'return_already_decided' } } })).toBe('already_decided');
    expect(returnErrorKey(new Error('x'))).toBe('other');
  });
});
