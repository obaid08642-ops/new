import AsyncStorage from '@react-native-async-storage/async-storage';
import { PAYMENT_IN_FLIGHT_KEY, PAYMENT_IN_FLIGHT_MAX_AGE_MS, clearPayment, readPaymentInFlight, rememberPayment, resumeHref, shouldResume } from './paymentInFlight';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
    removeItem: jest.fn(async (k: string) => { mockStore.delete(k); }),
  },
}));

const NOW = 1_800_000_000_000;

describe('15.8 a payment in flight survives the app being killed', () => {
  beforeEach(() => mockStore.clear());

  it('remembers ids only, and reads them back for the same account', async () => {
    await rememberPayment({ userId: 'u1', transactionId: 'tx-1', bookingKind: 'pharmacy', bookingId: 'ord-1' }, NOW);
    const raw = mockStore.get(PAYMENT_IN_FLIGHT_KEY)!;
    expect(raw).not.toMatch(/amount|card|token|url/i);
    expect(await readPaymentInFlight('u1', NOW + 1000)).toMatchObject({ userId: 'u1', transactionId: 'tx-1', bookingKind: 'pharmacy', bookingId: 'ord-1' });
  });

  it('another account on the same phone never sees it', async () => {
    await rememberPayment({ userId: 'u1', transactionId: 'tx-1' }, NOW);
    expect(await readPaymentInFlight('u2', NOW)).toBeNull();
    expect(await readPaymentInFlight(null, NOW)).toBeNull();
    expect(mockStore.has(PAYMENT_IN_FLIGHT_KEY)).toBe(true); // not wiped for the owner
  });

  it('a marker older than 72 hours, from the future, or malformed is dropped', async () => {
    await rememberPayment({ userId: 'u1', transactionId: 'tx-1' }, NOW);
    expect(await readPaymentInFlight('u1', NOW + PAYMENT_IN_FLIGHT_MAX_AGE_MS + 1)).toBeNull();
    expect(mockStore.has(PAYMENT_IN_FLIGHT_KEY)).toBe(false);
    await rememberPayment({ userId: 'u1', transactionId: 'tx-2' }, NOW + 10 * 60_000);
    expect(await readPaymentInFlight('u1', NOW)).toBeNull(); // written "in the future" relative to a clock that moved back
    mockStore.set(PAYMENT_IN_FLIGHT_KEY, '{not json');
    expect(await readPaymentInFlight('u1', NOW)).toBeNull();
    expect(mockStore.has(PAYMENT_IN_FLIGHT_KEY)).toBe(false);
  });

  it('writes nothing without an account and a payment id, and refuses ids that are not plain', async () => {
    await rememberPayment({ userId: undefined, transactionId: 'tx-1' }, NOW);
    await rememberPayment({ userId: 'u1' }, NOW);
    await rememberPayment({ userId: 'u1', transactionId: 'a b/../c' }, NOW);
    expect(mockStore.size).toBe(0);
  });

  it('clearing with an id leaves a newer payment alone', async () => {
    await rememberPayment({ userId: 'u1', transactionId: 'tx-new' }, NOW);
    await clearPayment('tx-old');
    expect(mockStore.has(PAYMENT_IN_FLIGHT_KEY)).toBe(true);
    await clearPayment('tx-new');
    expect(mockStore.has(PAYMENT_IN_FLIGHT_KEY)).toBe(false);
    await rememberPayment({ userId: 'u1', gatewayId: 'gw-1' }, NOW);
    await clearPayment('gw-1');
    expect(mockStore.has(PAYMENT_IN_FLIGHT_KEY)).toBe(false);
  });

  it('a storage failure never breaks a payment', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    await expect(rememberPayment({ userId: 'u1', transactionId: 'tx-1' }, NOW)).resolves.toBeUndefined();
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    expect(await readPaymentInFlight('u1', NOW)).toBeNull();
  });

  it('builds the result screen address from the marker, and resumes only outside the payment screens', async () => {
    await rememberPayment({ userId: 'u1', transactionId: 'tx-1', bookingKind: 'lab', bookingId: 'b-1' }, NOW);
    const m = (await readPaymentInFlight('u1', NOW))!;
    expect(resumeHref(m)).toEqual({ pathname: '/payments/result', params: { transactionId: 'tx-1', bookingKind: 'lab', bookingId: 'b-1' } });
    expect(shouldResume(m, '/(tabs)')).toBe(true);
    expect(shouldResume(m, '/pharmacy/payment')).toBe(true);
    expect(shouldResume(m, '/payments/result')).toBe(false);
    expect(shouldResume(null, '/(tabs)')).toBe(false);
  });
});
