import { readFileSync } from 'node:fs';

jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));

import { DIAG_ART, DIAG_ART_KEYS, DIAG_ART_TONE, LAB_ART_KEYS, RAD_ART_KEYS, diagArtKey, filterByArt, mostRequested } from '../../../../packages/ui/icons/diag-art';
import { SERVICE_TONES } from '../../../../packages/ui/icons/fill';
import { catalogArt, isNearEnd } from '../../utils/diagCatalog';
import { normalizeLabService } from '../../utils/labMappers';
import { clearDraft, getDraft, startDraft } from '../../utils/orderingBooking';
import { parseQuote } from '../../utils/ordering';
import { cartIdsToClear, isSingleOrder, singleOrderRoute } from '../../utils/singleOrder';

/** Owner review G4, lead round: category illustrations, chips + infinite list, Order now skips the cart. Pure parts. TEST values. */

describe('category art (shared with the web)', () => {
  it('has twelve arts with shapes and a service tone, none with a raw colour', () => {
    expect(DIAG_ART_KEYS).toHaveLength(12);
    for (const key of DIAG_ART_KEYS) {
      expect(DIAG_ART[key].length).toBeGreaterThan(1);
      expect(SERVICE_TONES).toContain(DIAG_ART_TONE[key]);
      expect(JSON.stringify(DIAG_ART[key])).not.toMatch(/#[0-9a-fA-F]{3,8}|rgb/);
    }
  });
  it('maps a catalogue row of each kind to a category, and falls back inside the kind', () => {
    const lab = (o: Partial<Parameters<typeof catalogArt>[1]>) => catalogArt('lab', { name: '', category: '', sampleType: '', modality: '', bodyPart: '', allNames: [], ...o });
    const scan = (o: Partial<Parameters<typeof catalogArt>[1]>) => catalogArt('radiology', { name: '', category: '', sampleType: '', modality: '', bodyPart: '', allNames: [], ...o });
    expect(lab({ name: 'Fasting glucose', sampleType: 'blood' })).toBe('sugar');
    expect(lab({ name: 'Vitamin D' })).toBe('vitamins');
    expect(lab({ name: 'Urinalysis', sampleType: 'urine' })).toBe('urine');
    expect(lab({ name: 'Something', sampleType: '' })).toBe('blood');
    expect(scan({ name: 'Knee', modality: 'mri' })).toBe('mri');
    expect(scan({ name: 'Mammogram' })).toBe('mammography');
    expect(scan({ name: 'Something' })).toBe('xray');
    expect(LAB_ART_KEYS as readonly string[]).toContain(lab({ name: '???' }));
    expect(RAD_ART_KEYS as readonly string[]).toContain(scan({ name: '???' }));
    expect(diagArtKey({ kind: 'radiology', modality: 'CT' })).toBe('ct');
  });
  it('reads the mapping fields from the backend row', () => {
    const item = normalizeLabService({ id: 'r1', name_en: 'Knee', modality: 'MRI', modality_category: 'MRI', body_part: 'knee', popularity: 12, name_ar: 'ركبة' });
    expect(item).toMatchObject({ modality: 'MRI MRI', bodyPart: 'knee', popularity: 12 });
    expect(item && catalogArt('radiology', item)).toBe('mri');
    expect(normalizeLabService({ id: 'x', name_en: 'No score' })?.popularity).toBe(0);
  });
});

describe('chips, most requested, infinite scroll', () => {
  const rows = [
    { id: 'a', art: 'blood' as const, popularity: 1 },
    { id: 'b', art: 'sugar' as const, popularity: 7 },
    { id: 'c', art: 'blood' as const, popularity: 7 },
  ];
  it('filters by the mapped category and keeps the order', () => {
    expect(filterByArt(rows, 'blood').map((r) => r.id)).toEqual(['a', 'c']);
    expect(filterByArt(rows, 'all')).toHaveLength(3);
  });
  it('most requested is the highest popularity first, ties in catalogue order', () => {
    expect(mostRequested(rows, 2).map((r) => r.id)).toEqual(['b', 'c']);
  });
  it('reports the end of a scroll', () => {
    expect(isNearEnd({ layoutHeight: 800, contentHeight: 5600, offsetY: 5000 })).toBe(true);
    expect(isNearEnd({ layoutHeight: 800, contentHeight: 5600, offsetY: 100 })).toBe(false);
    expect(isNearEnd({ layoutHeight: 800, contentHeight: 0, offsetY: 0 })).toBe(false);
    expect(isNearEnd({ layoutHeight: 0, contentHeight: 900, offsetY: 0 })).toBe(false);
  });
});

describe('Order now skips the cart', () => {
  it('builds the route to the lab choice with that one item, the place and the payer', () => {
    expect(singleOrderRoute({ kind: 'lab', id: 't1', name: 'CBC', place: 'home', payer: 'cash' })).toEqual({ pathname: '/diagnostics/lab-comparison', params: { kind: 'lab', id: 't1', name: 'CBC', single: '1', mode: 'home', payer: 'cash' } });
    expect(singleOrderRoute({ kind: 'radiology', id: 's1', name: 'MRI', place: 'clinic', payer: 'insurance' }).params).toMatchObject({ mode: 'facility', payer: 'insurance' });
    expect(singleOrderRoute({ kind: 'lab', id: 't1', name: 'CBC' }).params).not.toHaveProperty('mode');
  });
  it('is a one-item order only with the item id and single=1 (the legacy ?id= entry still adds to the cart)', () => {
    expect(isSingleOrder({ id: 't1', single: '1' })).toBe(true);
    expect(isSingleOrder({ id: 't1' })).toBe(false);
    expect(isSingleOrder({ single: '1' })).toBe(false);
    expect(isSingleOrder({ id: ['t1'], single: ['1'] })).toBe(true);
  });
  it('leaves the cart alone after booking a one-item order, and clears the booked lines of a cart order', () => {
    expect(cartIdsToClear({ single: true }, ['t1'])).toEqual([]);
    expect(cartIdsToClear({}, ['a', 'b'])).toEqual(['a', 'b']);
    expect(cartIdsToClear({ single: false }, ['a'])).toEqual(['a']);
  });
  it('the draft carries the single flag and the item name to the time and pay steps', () => {
    clearDraft();
    const quote = parseQuote({ quote_id: 'oq_s', expires_at: '2026-10-22T12:00:00Z', estimate: false, groups: [], from_price: null })!;
    startDraft({ kind: 'lab', payer: 'cash', quote, lat: 1, lng: 2, placeLine: null, single: true, names: { t1: 'CBC' } });
    expect(getDraft()).toMatchObject({ single: true, names: { t1: 'CBC' } });
    clearDraft();
  });
  it('the screens wire it: comparison does not add to the cart in a one-item order, pay does not clear it', () => {
    const cmp = readFileSync('app/diagnostics/lab-comparison.tsx', 'utf8');
    expect(cmp).toContain('if (id && !single) {');
    expect(cmp).toContain('single: true');
    const confirm = readFileSync('app/diagnostics/confirm.tsx', 'utf8');
    expect(confirm).toContain('cartIdsToClear(draft, catalogIds)');
    const detail = readFileSync('app/diagnostics/test-detail.tsx', 'utf8');
    expect(detail).toContain('singleOrderRoute({ kind, id, name: data.name })');
  });
});

describe('new keys in the six languages', () => {
  const keys = ['diag.hub.popular', 'diag.hub.allScans', 'diag.cat.group', ...DIAG_ART_KEYS.map((key) => `diag.cat.${key}`), 'ordering.match.single'];
  const en = JSON.parse(readFileSync('src/i18n/locales/en.json', 'utf8')) as Record<string, string>;
  it.each(['ar', 'en', 'ur', 'hi', 'bn', 'tl'])('%s', (loc) => {
    const m = JSON.parse(readFileSync(`src/i18n/locales/${loc}.json`, 'utf8')) as Record<string, string>;
    for (const key of keys) {
      expect(m[key]?.trim()).toBeTruthy();
      if (loc !== 'en' && !/^(CT|MRI)$/.test(en[key])) expect(m[key]).not.toBe(en[key]);
    }
  });
});
