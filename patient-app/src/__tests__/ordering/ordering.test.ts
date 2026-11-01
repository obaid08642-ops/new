import { basketFrom, basketShares, facilityOnlyIds, itemCoverage, orderingErrorKey, parseQuote, providerName, sortRows } from '../../utils/ordering';
import { buildContext, parseMembers, parsePolicy, placeOf } from '../../utils/orderingContext';

const row = (id: string, total: number, extra: Record<string, unknown> = {}) => ({ provider_id: id, name_ar: 'أ' + id, name_en: 'P' + id, total, distance_km: 3, rating: 4, in_network: true, earliest_at: '2026-10-23T10:00:00.000Z', turnaround_hours: 24, ...extra });
const quote = {
  quote_id: 'oq_1', expires_at: '2026-10-22T12:00:00Z', estimate: true,
  groups: [
    { mode: 'home', items: [{ catalog_id: 'a' }, { catalog_id: 'b' }], from_price: { total: 165, providers_count: 3 },
      best_match: { ...row('p1', 165, { home_fee: 24, vat_rate: 0.15, vat: 21.52, subtotal: 143.48 }), items: [{ catalog_id: 'a', price: 70, coverage: 'covered' }, { catalog_id: 'b', price: 70, coverage: 'not_covered' }, { catalog_id: 'x', price: 1, coverage: 'bogus' }], estimated_insurance_share: 56, patient_share: 109 },
      compare: [row('p1', 165), row('p2', 140, { rating: 5, distance_km: 9, covers_all: false, missing: ['b'] }), { nope: 1 }], split_suggestion: null, empty: null },
    { mode: 'facility', items: [{ catalog_id: 'c', facility_only: true }], from_price: { total: 450, providers_count: 2 },
      best_match: { ...row('p3', 450), items: [], estimated_insurance_share: 190, patient_share: 260 }, compare: [], split_suggestion: null, empty: null },
  ],
  from_price: { total: 615, providers_count: 2 },
};

describe('M6 ordering quote parser', () => {
  const q = parseQuote(quote)!;
  it('reads groups, rows and the flags; drops malformed rows and unknown coverage', () => {
    expect(q.estimate).toBe(true);
    expect(q.groups).toHaveLength(2);
    expect(q.groups[0].compare.map((r) => r.provider_id)).toEqual(['p1', 'p2']);
    expect(q.groups[0].compare[1]).toMatchObject({ covers_all: false, missing: ['b'] });
    expect(q.groups[0].best_match?.items.map((i) => i.coverage)).toEqual(['covered', 'not_covered', null]);
  });
  it('returns null without id or groups', () => {
    expect(parseQuote(null)).toBeNull();
    expect(parseQuote({ quote_id: 'x', groups: [] })).toBeNull();
  });
  it('parses the empty alternatives and a split suggestion', () => {
    const e = parseQuote({ quote_id: 'e', groups: [{ mode: 'home', items: [], from_price: null, best_match: null, compare: [], split_suggestion: { assignments: [{ provider_id: 'a', catalog_ids: ['1'] }], total: 90 }, empty: { reason: 'no_provider', alternatives: [{ type: 'facility_nearby', providers_count: 3, nearest_km: 2.1 }, { type: 'x' }, { type: 'broadcast' }] } }] })!;
    expect(e.groups[0].split_suggestion?.total).toBe(90);
    expect(e.groups[0].empty?.alternatives).toEqual([{ type: 'facility_nearby', providers_count: 3, nearest_km: 2.1 }, { type: 'broadcast', providers_count: null, nearest_km: null }]);
  });
});

describe('M6 ordering maths', () => {
  const q = parseQuote(quote)!;
  it('sums the groups and the shares from the server numbers', () => {
    expect(basketFrom(q.groups)).toEqual({ total: 615, providers_count: 2 });
    expect(basketShares(q.groups)).toEqual({ total: 615, insurance: 246, patient: 369 });
    expect(basketFrom([{ ...q.groups[0], from_price: null }])).toBeNull();
  });
  it('lists the facility-only items', () => expect(facilityOnlyIds(q.groups)).toEqual(['c']));
  it('sorts on the row fields', () => {
    const rows = q.groups[0].compare;
    expect(sortRows(rows, 'cheapest')[0].provider_id).toBe('p2');
    expect(sortRows(rows, 'rating')[0].provider_id).toBe('p2');
    expect(sortRows(rows, 'nearest')[0].provider_id).toBe('p1');
    expect(sortRows(rows, null)).toBe(rows);
  });
  it('gives one item its coverage and the server shares', () => {
    expect(itemCoverage(q.groups[0], 'a')).toEqual({ coverage: 'covered', price: 70, insurance_share: 56, patient_share: 109 });
    expect(itemCoverage(q.groups[0], 'zzz')).toBeNull();
    expect(itemCoverage(undefined, 'a')).toBeNull();
  });
  it('picks the name by language', () => {
    expect(providerName({ name_ar: 'ع', name_en: 'E' }, 'ar')).toBe('ع');
    expect(providerName({ name_ar: 'ع', name_en: null }, 'en')).toBe('ع');
  });
  it('maps the stable error codes', () => {
    expect(orderingErrorKey(new Error('insurance_not_saved'))).toBe('ordering.err.insuranceNotSaved');
    expect(orderingErrorKey(new Error('unknown_catalog_item'))).toBe('ordering.err.unknownItem');
    expect(orderingErrorKey(new Error('family_member_not_found'))).toBe('ordering.err.memberNotFound');
    expect(orderingErrorKey(new Error('boom'))).toBe('ordering.err.generic');
  });
});

describe('M6 ordering context', () => {
  const addresses = [{ id: 'a1', lat: undefined }, { id: 'a2', lat: 24.7, lng: 46.7, is_default: false }, { id: 'a3', lat: 24.8, lng: 46.8, is_default: true }];
  it('parses policy and members', () => {
    expect(parsePolicy({ data: { provider: 'Bupa', class: 'Gold' } })).toEqual({ company: 'Bupa', cls: 'Gold' });
    expect(parsePolicy({ provider: 'Bupa' })).toBeNull();
    expect(parsePolicy(null)).toBeNull();
    expect(parseMembers([{ id: 'm1', display_name: 'Sara' }, { user_id: 'u2', display_name: 'No id' }])).toEqual([{ id: 'm1', name: 'Sara' }]);
  });
  it('takes the default address with a map point', () => expect(placeOf(addresses)?.id).toBe('a3'));
  it('defaults the payer to the saved policy and falls back to cash', () => {
    const profile = { addresses, policy: { company: 'Bupa', cls: 'Gold' }, members: [{ id: 'm1', name: 'Sara' }] };
    const base = { mode: 'home' as const, payer: null, memberId: null, staffGender: null };
    expect(buildContext(profile, base).body).toMatchObject({ mode: 'home', lat: 24.8, lng: 46.8, payer: 'insurance' });
    expect(buildContext(profile, { ...base, payer: 'cash' }).body?.payer).toBe('cash');
    expect(buildContext({ ...profile, policy: null }, { ...base, payer: 'insurance' }).body?.payer).toBe('cash');
    expect(buildContext(profile, { ...base, memberId: 'm1', staffGender: 'female' }).body).toMatchObject({ family_member_id: 'm1', staff_gender: 'female' });
    expect(buildContext(profile, { ...base, memberId: 'unknown' }).body).not.toHaveProperty('family_member_id');
  });
  it('asks for a place when no address has a map point', () => {
    const r = buildContext({ addresses: [{ id: 'a1' }], policy: null, members: [] }, { mode: 'home', payer: null, memberId: null, staffGender: null });
    expect(r).toMatchObject({ body: null, needs: 'place' });
  });
});

describe('M6 ordering basket lines', () => {
  it('takes the items from the lines and the visit fee the server states', () => {
    const { basketLines } = require('../../utils/ordering');
    const q = parseQuote(quote)!;
    // group 1: items 70 + 70 + 1 (the unknown coverage line still has a price) = 141, and the server states home_fee 24 (not total - items)
    expect(basketLines([q.groups[0]])).toEqual({ items: 141, fee: 24 });
    expect(basketLines([{ ...q.groups[0], best_match: null }])).toBeNull();
  });
});
