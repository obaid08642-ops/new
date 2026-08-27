import { buildFamilyCalendarPayload, parseFamilyCalendarEvents } from './family-calendar-contract';

describe('family calendar contract', () => {
  it('requires an explicit title, schedule, member and allowed event type', () => {
    expect(buildFamilyCalendarPayload({ title: '  موعد متابعة  ', eventDate: '2026-09-01T10:00:00.000Z', memberUserId: 'member-1', type: 'appointment' })).toEqual({
      title: 'موعد متابعة', event_date: '2026-09-01T10:00:00.000Z', member_user_id: 'member-1', type: 'appointment',
    });
    expect(() => buildFamilyCalendarPayload({ title: 'موعد', eventDate: '', memberUserId: 'member-1', type: 'appointment' })).toThrow('event_date');
    expect(() => buildFamilyCalendarPayload({ title: 'موعد', eventDate: '2026-09-01', memberUserId: null, type: 'appointment' })).toThrow('member_user_id');
  });

  it('rejects a malformed calendar response instead of presenting a false empty state', () => {
    expect(() => parseFamilyCalendarEvents({ data: [] })).toThrow('response must be an array');
    expect(parseFamilyCalendarEvents([{ id: 'event-1' }, null])).toEqual([{ id: 'event-1' }]);
  });
});
