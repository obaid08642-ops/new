import { SlotService } from '../slot.service';

const chain = (rows: any) => ({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(rows) }) });

describe('SlotService leave linkage (R12)', () => {
  const doctor: any = {
    id: 'd1',
    account_id: 'acc-1',
    user_id: 'u-1',
    consultation_modes: ['clinic'],
    working_hours: [{ day: 'all', open: '09:00', close: '17:00' }],
  };

  it('blocks the whole day with reason on_leave when an approved leave overlaps', async () => {
    const appt = { find: jest.fn().mockReturnValue(chain([])) };
    const leaves = { findOne: jest.fn().mockReturnValue(chain({ id: 'lv1' })) };
    const svc = new SlotService(appt as any, leaves as any);
    const out: any = await svc.slotsForDate(doctor, '2026-10-05', 'clinic');
    expect(out.slots).toEqual([]);
    expect(out.reason).toBe('on_leave');
    expect(leaves.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ provider_account_id: { $in: ['acc-1', 'u-1'] }, status: 'approved' }),
    );
  });

  it('keeps slots when no approved leave overlaps', async () => {
    const appt = { find: jest.fn().mockReturnValue(chain([])) };
    const leaves = { findOne: jest.fn().mockReturnValue(chain(null)) };
    const svc = new SlotService(appt as any, leaves as any);
    const out: any = await svc.slotsForDate(doctor, '2026-10-05', 'clinic');
    expect(out.reason).not.toBe('on_leave');
    expect(out.slots.length).toBeGreaterThan(0);
  });
});
