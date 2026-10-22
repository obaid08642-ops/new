import {
  kindOfRoles, orderingErrorMessage, parseAmount, toggleIn, setInsurerClasses, insuranceSummary, validateSettings, buildSettingsPayload,
  filterItems, uncoveredCompanies, buildItemPayload, buildBulkPayload, previewPrice, looksLikeCsv, rejectedToCsv, partPoints, csvTemplate,
} from '../logic';
import type { OrderingItemView, OrderingSettings } from '../../../api/ordering';

const settings = (p: Partial<OrderingSettings> = {}): OrderingSettings => ({ modes: ['home', 'facility'], home_fee: 30, home_radius_km: 8, auto_accept: false, walk_in: false, staff_genders: [], accepted_insurance: [], ...p });
const item = (p: Partial<OrderingItemView> = {}): OrderingItemView => ({
  service_kind: 'lab', catalog_id: 'cbc', name_ar: 'صورة دم', name_en: 'CBC', modes: ['home', 'facility'], prices: {}, accepted_insurance: [],
  turnaround_hours: null, preparation: null, available: true, inherited: { modes: true, accepted_insurance: true }, ...p,
});
const draft = { facility: '', home: '', turnaround: '', prep_ar: '', prep_en: '', available: true, homeAllowed: true };

describe('ordering logic', () => {
  it('kind from role', () => {
    expect(kindOfRoles(['lab'])).toBe('lab');
    expect(kindOfRoles([undefined, 'Nurse'])).toBe('nursing');
    expect(kindOfRoles(['doctor'])).toBeNull();
  });
  it('maps stable codes and falls back', () => {
    expect(orderingErrorMessage({ response: { status: 400, data: { message: 'item_price_invalid' } } }, false)).toBe('The price is not valid');
    expect(orderingErrorMessage({ response: { status: 400, data: { message: 'home_radius_invalid' } } }, true)).toContain('50');
    expect(orderingErrorMessage({ response: { status: 500, data: {} } }, false)).toBe('Could not complete the action');
    expect(orderingErrorMessage({ message: 'Network Error' }, false)).toBe('Check your connection and try again');
  });
  it('parses amounts', () => {
    expect(parseAmount(' 12.5 ')).toBe(12.5);
    expect(parseAmount('')).toBeUndefined();
    expect(parseAmount('abc')).toBeUndefined();
  });
  it('insurer classes: empty selection removes the entry', () => {
    expect(toggleIn(['a'], 'a')).toEqual([]);
    const l = setInsurerClasses([], 'c1', ['A']);
    expect(l).toEqual([{ company_id: 'c1', classes: ['A'], active: true }]);
    expect(setInsurerClasses(l, 'c1', [])).toEqual([]);
    expect(insuranceSummary([{ company_id: 'c1', classes: ['A', 'B'], active: true }, { company_id: 'c2', classes: ['A'], active: false }])).toEqual({ companies: 1, classes: 2 });
  });
  it('validates settings like the backend', () => {
    expect(validateSettings(settings({ modes: [] })).code).toBe('ordering_modes_required');
    expect(validateSettings(settings({ home_radius_km: 60 })).code).toBe('home_radius_invalid');
    expect(validateSettings(settings({ home_radius_km: null })).code).toBe('home_radius_invalid');
    expect(validateSettings(settings({ modes: ['facility'], home_radius_km: null })).ok).toBe(true);
    expect(validateSettings(settings({ accepted_insurance: [{ company_id: 'x', classes: [], active: true }] })).code).toBe('accepted_insurance_classes_required');
    expect(buildSettingsPayload(settings({ modes: ['facility'] }))).toMatchObject({ home_fee: 0, home_radius_km: null });
  });
  it('filters items and finds uncovered insurers', () => {
    const a = item({ prices: { facility: 45 } });
    const b = item({ catalog_id: 'tsh', name_en: 'TSH', name_ar: 'غدة', turnaround_hours: 8 });
    expect(filterItems([a, b], '', 'noprice', false).map((x) => x.catalog_id)).toEqual(['tsh']);
    expect(filterItems([a, b], '', 'custom', false).map((x) => x.catalog_id)).toEqual(['tsh']);
    expect(filterItems([a, b], 'cbc', 'all', false)).toHaveLength(1);
    const defaults = [{ company_id: 'c1', classes: ['A'], active: true }, { company_id: 'c2', classes: ['A'], active: true }];
    expect(uncoveredCompanies(a, defaults)).toEqual([]);
    const own = item({ inherited: { modes: true, accepted_insurance: false }, accepted_insurance: [defaults[0]] });
    expect(uncoveredCompanies(own, defaults)).toEqual(['c2']);
  });
  it('builds the item payload', () => {
    const r = buildItemPayload('lab', item(), { ...draft, facility: '60', home: '75', turnaround: '6', prep_en: ' no fasting ' }, ['home', 'facility'], true);
    expect(r.error).toBeUndefined();
    expect(r.body).toMatchObject({ catalog_id: 'cbc', modes: null, prices: { facility: 60, home: 75 }, turnaround_hours: 6, preparation: { en: 'no fasting' }, accepted_insurance: null });
    expect(buildItemPayload('lab', item(), { ...draft, facility: '-1' }, ['facility'], true).error).toBe('item_price_invalid');
    expect(buildItemPayload('lab', item(), { ...draft, home: '10', homeAllowed: false }, ['home', 'facility'], true).error).toBe('item_mode_not_offered');
    expect(buildItemPayload('lab', item(), { ...draft, homeAllowed: false }, ['home', 'facility'], true).body.modes).toEqual(['facility']);
    expect(buildItemPayload('radiology', item({ modes: ['facility'] }), draft, ['home', 'facility'], false).body.modes).toBeNull();
  });
  it('builds bulk payloads and previews', () => {
    expect(buildBulkPayload('lab', { op: 'percent', value: '10', mode: 'home' }, []).body).toEqual({ service_kind: 'lab', mode: 'home', percent: 10 });
    expect(buildBulkPayload('lab', { op: 'set', value: '50', mode: 'facility' }, ['a']).body).toEqual({ service_kind: 'lab', mode: 'facility', set_price: 50, catalog_ids: ['a'] });
    expect(buildBulkPayload('lab', { op: 'set', value: '', mode: 'facility' }, []).error).toBe('bulk_change_required');
    expect(buildBulkPayload('lab', { op: 'percent', value: '-100', mode: 'facility' }, []).error).toBe('item_price_invalid');
    expect(previewPrice(100, { op: 'percent', value: '10', mode: 'home' })).toBe(110);
    expect(previewPrice(undefined, { op: 'percent', value: '10', mode: 'home' })).toBeUndefined();
    expect(previewPrice(undefined, { op: 'set', value: '40', mode: 'home' })).toBe(40);
  });
  it('csv helpers', () => {
    expect(looksLikeCsv(csvTemplate())).toBe(true);
    expect(looksLikeCsv('﻿catalog_id,mode,price\r\na,home,1')).toBe(true);
    expect(looksLikeCsv('a,b')).toBe(false);
    expect(rejectedToCsv([{ line: 3, reason: 'item_price_invalid' }])).toBe('line,reason\n3,item_price_invalid\n');
  });
  it('points a missing part adds', () => {
    const w = { prices: 40, modes_hours: 20, insurance: 20, prep_turnaround: 10, photo_licence: 10 };
    const parts = { prices: 0.5, modes_hours: 1, insurance: 1, prep_turnaround: 1, photo_licence: 1 };
    expect(partPoints('prices', parts, w)).toBe(20);
    expect(partPoints('insurance', parts, w)).toBe(0);
  });
});
