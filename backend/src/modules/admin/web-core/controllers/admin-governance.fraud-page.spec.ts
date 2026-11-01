import { fraudPageWindow } from './admin-governance.controller';

describe('fraud alerts paging', () => {
  it('page 1 takes live rows first and fills the rest from stored rows', () => {
    expect(fraudPageWindow(3, 0, 5)).toEqual({ liveSkip: 0, liveTake: 3, storedSkip: 0, storedTake: 2 });
  });
  it('page 2 does not repeat the live rows', () => {
    expect(fraudPageWindow(3, 5, 5)).toEqual({ liveSkip: 3, liveTake: 0, storedSkip: 2, storedTake: 5 });
  });
  it('a page inside the live rows takes only live rows', () => {
    expect(fraudPageWindow(20, 5, 5)).toEqual({ liveSkip: 5, liveTake: 5, storedSkip: 0, storedTake: 0 });
  });
  it('every row is returned once across pages', () => {
    const seen = new Set<string>();
    for (let page = 1; page <= 4; page++) {
      const w = fraudPageWindow(7, (page - 1) * 5, 5);
      for (let i = 0; i < w.liveTake; i++) seen.add(`l${w.liveSkip + i}`);
      for (let i = 0; i < w.storedTake; i++) seen.add(`s${w.storedSkip + i}`);
    }
    expect([...seen].filter((k) => k[0] === 'l').length).toBe(7);
  });
});
