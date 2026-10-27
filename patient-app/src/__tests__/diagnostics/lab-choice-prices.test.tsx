import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LabComparison from '../../../app/diagnostics/lab-comparison';

/** Owner review G4, D: in the lab choice step every lab is listed with ITS OWN price for the chosen item(s). TEST values. */

jest.setTimeout(30000);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ kind: 'lab', id: 't1', name: 'Test CBC', single: '1' }),
  useFocusEffect: () => undefined,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
const mockAdd = jest.fn();
jest.mock('../../context/DiagnosticsCartContext', () => ({ useDiagnosticsCart: () => ({ items: [{ id: 'other', kind: 'lab' }], addItem: (...a: unknown[]) => mockAdd(...a) }) }));
jest.mock('../../components/ordering/ContextBar', () => ({ ContextBar: () => null }));
jest.mock('../../components/ordering/OrderingKit', () => ({ ...jest.requireActual('../../components/ordering/OrderingKit'), ContextGate: ({ children }: { children: React.ReactNode }) => children }));
const mockQuoteIds = jest.fn();
jest.mock('../../utils/useOrderingContext', () => ({
  useOrderingContext: () => ({ body: { mode: 'home', lat: 1, lng: 2, payer: 'cash' }, payer: 'cash', choice: { mode: 'home', staffGender: null }, place: null, setMode: jest.fn(), setStaffGender: jest.fn() }),
}));
jest.mock('../../utils/useOrderingQuote', () => ({
  useOrderingQuote: (_kind: string, ids: string[]) => {
    mockQuoteIds(ids);
    const { parseQuote } = jest.requireActual('../../utils/ordering') as typeof import('../../utils/ordering');
    const row = (id: string, total: number) => ({ provider_id: id, name_ar: id, name_en: id, total, distance_km: 3, rating: 4, in_network: false, earliest_at: null, turnaround_hours: 24 });
    return {
      status: 'ready', errorKey: '', reload: jest.fn(),
      quote: parseQuote({
        quote_id: 'oq_1', expires_at: '2026-10-22T12:00:00Z', estimate: false, from_price: null,
        groups: [{ mode: 'home', items: [{ catalog_id: 't1' }], from_price: { total: 90, providers_count: 3 },
          best_match: { ...row('Lab Best', 90), items: [{ catalog_id: 't1', price: 80 }], estimated_insurance_share: 0, patient_share: 90 },
          compare: [row('Lab Best', 90), row('Lab Mid', 130), row('Lab High', 175)], split_suggestion: null, empty: null }],
      }),
    };
  },
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

describe('lab choice for one item', () => {
  it('quotes only that item (not the cart) and lists every lab with its own price', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><LabComparison /></SafeAreaProvider>);
    expect(mockQuoteIds).toHaveBeenCalledWith(['t1']);
    expect(mockQuoteIds).not.toHaveBeenCalledWith(['other']);
    for (const [name, price] of [['Lab Best', '90'], ['Lab Mid', '130'], ['Lab High', '175']]) {
      expect(screen.getAllByText(new RegExp(name)).length).toBeGreaterThan(0);
      expect(screen.getAllByText(new RegExp(`^${price}`)).length).toBeGreaterThan(0);
    }
    expect(mockAdd).not.toHaveBeenCalled();
  });
});
