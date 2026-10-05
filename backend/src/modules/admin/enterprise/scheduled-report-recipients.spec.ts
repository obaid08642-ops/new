// Fifth check: PATCH admin/scheduled-reports/:id stored recipients without the
// address check create() applies, so any string (or an empty list) could be
// saved for a report that emails revenue data.
import { BadRequestException } from '@nestjs/common';
import { AdminScheduledReportsController } from './admin-analytics.controller';

describe('scheduled report recipients are validated on update too', () => {
  const stored: any = { id: 'sr_1', recipients: ['owner@nabd.test'] };
  const updates: any[] = [];
  const conn: any = { collection: () => ({
    findOne: async () => stored,
    updateOne: async (_q: unknown, u: any) => { updates.push(u.$set); return {}; },
  }) };
  const ctrl = new (AdminScheduledReportsController as any)(conn);

  it('keeps only valid addresses and refuses a list with none', async () => {
    await ctrl.update('sr_1', { recipients: ['finance@nabd.test', 'not-an-email'] }, { id: 'adm' });
    expect(updates.pop().recipients).toEqual(['finance@nabd.test']);
    await expect(ctrl.update('sr_1', { recipients: ['nope'] }, { id: 'adm' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
