import { ForbiddenException } from '@nestjs/common';
import { ReportsTimelineController } from './timeline-compat.controller';

// GET reports/:id is a read of a medical record: only its owner. A row with no patient_id used to pass the check (the check only ran when
// the field was set) and was readable by every signed-in user.
describe('GET reports/:id owner check', () => {
  const make = (row: any) => {
    const conn: any = { collection: () => ({ findOne: async () => row }) };
    const access: any = { record: jest.fn(), log: jest.fn(), write: jest.fn() };
    return new ReportsTimelineController(conn, access);
  };

  it('refuses another patient', async () => {
    await expect(make({ id: 'r1', patient_id: 'p-owner', title: 'x' }).byId('r1', { id: 'p-other' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('refuses a report that has no patient_id (nobody owns it, so nobody reads it here)', async () => {
    await expect(make({ id: 'r2', title: 'x' }).byId('r2', { id: 'p-any' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('lets the owner read it', async () => {
    const out: any = await make({ id: 'r3', patient_id: 'p-owner', title: 'x' }).byId('r3', { id: 'p-owner' });
    expect(out.id).toBe('r3');
  });
});
