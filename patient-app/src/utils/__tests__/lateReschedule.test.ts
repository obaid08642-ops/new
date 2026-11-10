import { readLateReschedule } from '../lateReschedule';

describe('the late free reschedule offer', () => {
  it('is offered only when it is late and still available', () => {
    expect(readLateReschedule({ free_reschedule: { available: true, late: true, within_days: 14 } })).toEqual({ days: 14 });
    expect(readLateReschedule({ data: { free_reschedule: { available: true, late: true, within_days: 14 } } })).toEqual({ days: 14 });
    expect(readLateReschedule({ free_reschedule: { available: true, late: false, within_days: 14 } })).toBeNull();
    expect(readLateReschedule({ free_reschedule: { available: false, late: true, within_days: 14 } })).toBeNull();
  });
  it('ignores a broken answer', () => {
    expect(readLateReschedule(null)).toBeNull();
    expect(readLateReschedule({})).toBeNull();
    expect(readLateReschedule({ free_reschedule: { available: true, late: true, within_days: 'x' } })).toBeNull();
  });
});
