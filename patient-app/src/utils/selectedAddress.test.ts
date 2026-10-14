import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiFetch } from './api';
import { getSelectedAddress, hasMapPoint, readAddresses, resolveEffectiveAddress, setSelectedAddress, startingSelection } from './selectedAddress';

jest.mock('./api', () => ({ apiFetch: jest.fn() }));
const mockFetch = apiFetch as jest.Mock;

const saved = [
  { id: 'a1', label: 'Test home', street: 'Test street', city: 'Test city', lat: 24.7, lng: 46.6, is_default: true },
  { id: 'a2', label: 'Test work', street: 'Other street', lat: '24.8', lng: '46.7' },
  { id: 'a3', street: 'No point street' },
];

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('readAddresses', () => {
  it('reads each saved address, numeric strings as numbers, and drops an entry without an id', () => {
    const list = readAddresses([...saved, { label: 'no id' }, null]);
    expect(list.map((a) => a.id)).toEqual(['a1', 'a2', 'a3']);
    expect(list[1]).toMatchObject({ lat: 24.8, lng: 46.7, is_default: false });
    expect(list[2].lat).toBeUndefined();
    expect(readAddresses({ data: saved })).toHaveLength(3);
    expect(readAddresses('x')).toEqual([]);
  });

  it('knows which addresses have a map point', () => {
    const [home, , none] = readAddresses(saved);
    expect(hasMapPoint(home)).toBe(true);
    expect(hasMapPoint(none)).toBe(false);
    expect(hasMapPoint(null)).toBe(false);
  });
});

describe('startingSelection', () => {
  const list = readAddresses(saved);
  it('keeps the choice made on the screen, else the address picked last, else the default, else the first', () => {
    expect(startingSelection(list, 'a2', 'a3')).toBe('a2');
    expect(startingSelection(list, null, 'a3')).toBe('a3');
    expect(startingSelection(list, 'gone', 'gone-too')).toBe('a1');
    expect(startingSelection(list.map((a) => ({ ...a, is_default: false })), null, null)).toBe('a1');
    expect(startingSelection([], null, null)).toBeNull();
  });
});

describe('resolveEffectiveAddress', () => {
  it('returns the default when nothing was picked, and null when there are no addresses', async () => {
    mockFetch.mockResolvedValueOnce(saved);
    expect((await resolveEffectiveAddress())?.id).toBe('a1');
    mockFetch.mockResolvedValueOnce([]);
    expect(await resolveEffectiveAddress()).toBeNull();
  });

  it('returns the address picked last as the server has it now', async () => {
    await setSelectedAddress({ id: 'a2', label: 'Old name', lat: 1, lng: 1 });
    mockFetch.mockResolvedValueOnce(saved);
    expect(await resolveEffectiveAddress()).toMatchObject({ id: 'a2', label: 'Test work', lat: 24.8 });
  });

  it('forgets a pick that was deleted since, and falls back to the default', async () => {
    await setSelectedAddress({ id: 'deleted', label: 'Gone', lat: 1, lng: 1 });
    mockFetch.mockResolvedValueOnce(saved);
    expect((await resolveEffectiveAddress())?.id).toBe('a1');
    expect(await getSelectedAddress()).toBeNull();
  });

  it('keeps a pick when the saved list cannot be read, and an unsaved map pick', async () => {
    await setSelectedAddress({ id: 'a2', label: 'Test work', lat: 24.8, lng: 46.7 });
    mockFetch.mockRejectedValueOnce(new Error('OFFLINE_ERROR'));
    expect((await resolveEffectiveAddress())?.id).toBe('a2');
    await setSelectedAddress({ id: 'local-123', street: 'Dropped pin', lat: 2, lng: 3 });
    mockFetch.mockResolvedValueOnce(saved);
    expect((await resolveEffectiveAddress())?.id).toBe('local-123');
  });
});
