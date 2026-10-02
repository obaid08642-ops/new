import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// Boundaries only: API, router params, app context, safe area. The screen's own logic runs for real.
const mockApiFetch = jest.fn();
let mockParams: { ids?: string } = {};
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: any[]) => mockApiFetch(...a) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => mockParams }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/context/AppContext', () => {
  const colors = new Proxy({}, { get: () => '#111111' });
  return { useApp: () => ({ colors, isDark: false, lang: 'ar' }) };
});

import MedicineCompare from '../app/pharmacy/medicine-compare';

beforeEach(() => { mockApiFetch.mockReset(); mockApiFetch.mockResolvedValue([]); });

describe('pharmacy/medicine-compare', () => {
  it('POSTs the selected ids as JSON (the backend route is POST /medicines/compare)', async () => {
    mockParams = { ids: 'a1,b2' };
    await render(<MedicineCompare />);
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    const [path, init] = mockApiFetch.mock.calls[0];
    expect(path).toBe('/medicines/compare');
    expect(init).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(init.body)).toEqual({ ids: ['a1', 'b2'] });
  });

  it('does not invent ids when none are given', async () => {
    mockParams = {};
    await render(<MedicineCompare />);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
