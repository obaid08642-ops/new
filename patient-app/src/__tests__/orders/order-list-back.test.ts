jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));

import { ALL_ORDER_ENDPOINTS, PHARMACY_ORDER_ENDPOINTS, backFor, type OrderEndpoints } from '../../components/orders/OrderList';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const router = (require('expo-router') as { router: Record<'replace' | 'back' | 'canGoBack', jest.Mock> }).router;

const DIAGNOSTICS: OrderEndpoints = [
  ['labs', '/labs/bookings/mine'],
  ['radiology', '/radiology/bookings/mine'],
];

describe('OrderList back with nothing to go back to', () => {
  beforeEach(() => {
    router.replace.mockClear();
    router.back.mockClear();
    router.canGoBack.mockReturnValue(false);
  });

  it('goes to the diagnostics hub for labs and radiology', () => {
    backFor(DIAGNOSTICS)();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/diagnostics');
  });

  it('goes to the pharmacy hub for pharmacy orders', () => {
    backFor(PHARMACY_ORDER_ENDPOINTS)();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/pharmacy');
  });

  it('goes home for the all-services list', () => {
    backFor(ALL_ORDER_ENDPOINTS)();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('goes back when there is a screen to go back to', () => {
    router.canGoBack.mockReturnValue(true);
    backFor(DIAGNOSTICS)();
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
