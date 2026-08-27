import { buildMoodJournalPayload, parseMoodHistory } from './mood-journal-contract';

describe('mood journal contract', () => {
  it('sends only values deliberately selected by the patient', () => {
    expect(buildMoodJournalPayload({ mood: 'good', energy: undefined, stress: undefined, sleep: '', note: '  A note  ', tags: ['calm'] })).toEqual({
      mood: 'good', notes: 'A note', tags: ['calm'],
    });
  });

  it('rejects invalid optional readings before requesting a clinical record', () => {
    expect(() => buildMoodJournalPayload({ mood: 'okay', energy: 6, stress: undefined, sleep: '25', note: '', tags: [] })).toThrow('energy_level');
    expect(() => buildMoodJournalPayload({ mood: 'okay', energy: undefined, stress: undefined, sleep: 'not-a-number', note: '', tags: [] })).toThrow('sleep_hours');
  });

  it('accepts an authoritative raw history array and normalizes its legacy timestamp', () => {
    expect(parseMoodHistory([{ id: 'entry-1', mood: 'great', createdAt: '2026-08-19T00:00:00.000Z', energy_level: 5, tags: ['rested'] }])).toEqual([{ id: 'entry-1', mood: 'great', logged_at: '2026-08-19T00:00:00.000Z', energy_level: 5, tags: ['rested'] }]);
  });

  it('treats a malformed response as a load failure instead of an empty history', () => {
    expect(() => parseMoodHistory({ data: [] })).toThrow('response must be an array');
    expect(() => parseMoodHistory([{ mood: 'good' }])).toThrow('logged_at');
  });
});
