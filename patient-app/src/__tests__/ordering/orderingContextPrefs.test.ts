jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return { __esModule: true, default: { getItem: async (k: string) => store[k] ?? null, setItem: async (k: string, v: string) => { store[k] = v; } } };
});
import { isNewPatient, markContextSkipped, readContextSkipped } from '../../utils/orderingContextPrefs';

const empty = { addresses: [], policy: null, members: [] };

describe('isNewPatient', () => {
  it('is true only when nothing is saved', () => {
    expect(isNewPatient(empty)).toBe(true);
    expect(isNewPatient(null)).toBe(false);
    expect(isNewPatient({ ...empty, policy: { company: 'Bupa', cls: 'Gold' } })).toBe(false);
    expect(isNewPatient({ ...empty, members: [{ id: 'm1', name: 'Sara' }] })).toBe(false);
    expect(isNewPatient({ ...empty, addresses: [{ id: 'a1' }] })).toBe(false);
  });
});

describe('skip memory', () => {
  it('remembers the skip', async () => {
    await markContextSkipped();
    expect(await readContextSkipped()).toBe(true);
  });
});
