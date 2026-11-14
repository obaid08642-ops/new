import { dependantBody, readDependants } from '../../utils/dependants';

/** PT-03: the form of a dependant (a minor with no account) the guardian adds. TEST values only. */
const NOW = new Date('2026-11-09T12:00:00Z');
const full = { name: '  Test Child ', birthDate: '2020-05-17', relation: 'child' as const, consent: true };

describe('add a dependant', () => {
  it('builds the request only from a complete form, with the guardian consent', () => {
    expect(dependantBody(full, NOW)).toEqual({ name: 'Test Child', birth_date: '2020-05-17', relation_code: 'child', guardian_consent: true });
    expect(dependantBody({ ...full, consent: false }, NOW)).toBeNull();
    expect(dependantBody({ ...full, name: '   ' }, NOW)).toBeNull();
    expect(dependantBody({ ...full, relation: '' }, NOW)).toBeNull();
  });
  it('refuses a date that is not a real past day', () => {
    for (const birthDate of ['', '2020-5-17', '2020-02-31', '2027-01-01', '17/05/2020']) expect(dependantBody({ ...full, birthDate }, NOW)).toBeNull();
  });
  it('reads the list in both answer shapes and drops rows without an id or a name', () => {
    const rows = [{ id: 'd1', name: 'Test Child' }, { id: '', name: 'x' }, { id: 'd2', name: ' ' }, 'x'];
    expect(readDependants(rows)).toEqual([{ id: 'd1', name: 'Test Child' }]);
    expect(readDependants({ data: rows })).toEqual([{ id: 'd1', name: 'Test Child' }]);
    expect(readDependants(null)).toEqual([]);
  });
});
