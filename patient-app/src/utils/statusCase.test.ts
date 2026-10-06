import { statusCode, statusIs } from './statusCase';

describe('statusCase', () => {
  it('reads one status in one case', () => {
    expect(statusCode('COMPLETED')).toBe('completed');
    expect(statusCode(' Confirmed ')).toBe('confirmed');
    expect(statusCode(undefined)).toBe('');
    expect(statusCode(null)).toBe('');
  });

  it('matches a list of codes whatever the case on either side', () => {
    expect(statusIs('COMPLETED', ['completed'])).toBe(true);
    expect(statusIs('completed', ['COMPLETED'])).toBe(true);
    expect(statusIs('Pending', ['confirmed', 'pending'])).toBe(true);
    expect(statusIs('cancelled', ['confirmed', 'pending'])).toBe(false);
  });

  it('never matches a missing status', () => {
    expect(statusIs(undefined, [''])).toBe(false);
    expect(statusIs('', ['completed'])).toBe(false);
  });
});
