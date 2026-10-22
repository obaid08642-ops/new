import { describe, expect, it } from 'vitest';
import { CONFIRM_WORD_OFF, CONFIRM_WORD_ON, confirmationMatches, emergencyState, killSwitchRows, reasonValid } from './kill-switches';

describe('kill switches helpers (issues 955 / 995)', () => {
  it('turns GET /kill-switches into rows; only an explicit false is off', () => {
    const rows = killSwitchRows([
      { key: 'chat_enabled', name: 'المحادثات', description: 'd', danger: true, value: false, reason: 'spam wave', updated_at: '2026-10-15T10:00:00Z' },
      { key: 'reviews_enabled', name: 'نشر التقييمات', value: true },
      { name: 'no key' },
    ]);
    expect(rows.map((r) => [r.key, r.value, r.danger])).toEqual([['chat_enabled', false, true], ['reviews_enabled', true, false]]);
    expect(rows[0].reason).toBe('spam wave');
    expect(killSwitchRows(null)).toEqual([]);
    expect(killSwitchRows({ data: [] })).toEqual([]);
  });

  it('reads the emergency state; anything but active:true is not in maintenance', () => {
    expect(emergencyState({ active: true, reason: 'failover', updated_at: '2026-10-15T10:00:00Z' })).toEqual({ active: true, reason: 'failover', updatedAt: '2026-10-15T10:00:00Z' });
    expect(emergencyState(null).active).toBe(false);
    expect(emergencyState({ active: 'yes' }).active).toBe(false);
  });

  it('requires the exact confirmation word and a reason of at least 5 characters', () => {
    expect(confirmationMatches(` ${CONFIRM_WORD_ON} `, CONFIRM_WORD_ON)).toBe(true);
    expect(confirmationMatches(CONFIRM_WORD_OFF, CONFIRM_WORD_ON)).toBe(false);
    expect(confirmationMatches('', CONFIRM_WORD_ON)).toBe(false);
    expect(reasonValid('abcd')).toBe(false);
    expect(reasonValid('  abcd  ')).toBe(false);
    expect(reasonValid('abcde')).toBe(true);
  });
});
