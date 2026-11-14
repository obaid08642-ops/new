jest.mock('react-native-localize', () => require('react-native-localize/mock'));
import { countFilters, filterMeds } from '../src/utils/pharmacyCatalog';

const meds = [
  { id: 'a', name: 'Paracetamol', price: 5, requires_prescription: false },
  { id: 'b', name: 'Amoxicillin', price: 12, requires_prescription: true },
] as never[];
const base = { activeCat: 'all', search: '' };

describe('the prescription filter (any / only / none, as the web)', () => {
  it('any keeps both, only keeps the prescription ones, none keeps the others', () => {
    const ids = (rx: string) => filterMeds(meds, { ...base, filters: { rx } as never }).map((m: { id: string }) => m.id);
    expect(ids('')).toEqual(['a', 'b']);
    expect(ids('0')).toEqual(['a', 'b']);
    expect(ids('1')).toEqual(['b']);
    expect(ids('none')).toEqual(['a']);
  });

  it('counts only a real choice as an active filter', () => {
    expect(countFilters({ rx: '' } as never)).toBe(0);
    expect(countFilters({ rx: '0' } as never)).toBe(0);
    expect(countFilters({ rx: '1' } as never)).toBe(1);
    expect(countFilters({ rx: 'none' } as never)).toBe(1);
  });
});
