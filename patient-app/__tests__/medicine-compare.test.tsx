import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// Boundaries only: API, router params, app context, safe area. The screen's own logic runs for real.
const mockApiFetch = jest.fn();
let mockParams: { ids?: string } = {};
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: any[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() }, useLocalSearchParams: () => mockParams }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'ar', isRTL: true }) }));

import MedicineCompare from '../app/pharmacy/medicine-compare';
import { CartProvider, useCart } from '../src/context/CartContext';

function CartProbe() {
  const { items } = useCart();
  return <>{items.map((i) => <Text key={i.id}>{`in-cart:${i.id}:${i.qty}`}</Text>)}</>;
}
const ui = (
  <CartProvider>
    <MedicineCompare />
  </CartProvider>
);

beforeEach(() => { mockApiFetch.mockReset(); mockApiFetch.mockResolvedValue([]); });

describe('pharmacy/medicine-compare', () => {
  it('POSTs the selected ids as JSON (the backend route is POST /medicines/compare)', async () => {
    mockParams = { ids: 'a1,b2' };
    await render(ui);
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    const [path, init] = mockApiFetch.mock.calls[0];
    expect(path).toBe('/medicines/compare');
    expect(init).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(init.body)).toEqual({ ids: ['a1', 'b2'] });
  });

  it('does not invent ids when none are given', async () => {
    mockParams = {};
    await render(ui);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('draws only the rows the catalogue has a value for, marks the lowest price, and "add to cart" really adds', async () => {
    mockParams = { ids: 'a1,b2' };
    mockApiFetch.mockResolvedValue([
      { id: 'a1', name_ar: 'دواء أ', strength: '500 ملغ', price: 12, requires_prescription: false },
      { id: 'b2', name_ar: 'دواء ب', strength: '250 ملغ', price: 20, requires_prescription: true },
    ]);
    await render(<>{ui}</>);
    await waitFor(() => expect(screen.getByText('دواء أ')).toBeTruthy());
    expect(screen.getByText('التركيز')).toBeTruthy();
    // nobody has an active ingredient, a form, a pack size or side effects: those rows are not drawn (no "N/A" rows)
    expect(screen.queryByText('المادة الفعالة')).toBeNull();
    expect(screen.queryByText('الشكل')).toBeNull();
    expect(screen.queryByText('الآثار الجانبية')).toBeNull();
    // no ratings exist for medicines: never drawn
    expect(screen.queryByText('التقييم')).toBeNull();
    expect(screen.getAllByText('الأقل سعرًا')).toHaveLength(1);
    expect(screen.getAllByLabelText('أضف للسلة')).toHaveLength(2);
  });

  it('puts the medicine in the cart when "add to cart" is pressed (the button was a dead handler before)', async () => {
    mockParams = { ids: 'a1' };
    mockApiFetch.mockResolvedValue([{ id: 'a1', name_ar: 'دواء أ', price: 12, requires_prescription: false }]);
    await render(
      <CartProvider>
        <MedicineCompare />
        <CartProbe />
      </CartProvider>,
    );
    await waitFor(() => expect(screen.getByText('دواء أ')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('أضف للسلة'));
    await waitFor(() => expect(screen.getByText('in-cart:a1:1')).toBeTruthy());
  });
});
