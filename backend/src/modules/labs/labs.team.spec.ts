import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { LabsService } from './labs.service';

/** R7-3: real technicians, team-only assignment, real-device GPS. */
function serviceFor(opts: { accounts?: any[]; users?: any[]; booking?: any } = {}) {
  const service: any = Object.create(LabsService.prototype);
  service.bkgModel = {
    db: {
      collection: jest.fn((name: string) => {
        if (name === 'provider_accounts') return { find: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(opts.accounts ?? []) }) }) };
        if (name === 'users') return { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(opts.users ?? []) }) };
        return { findOne: jest.fn().mockResolvedValue(null) };
      }),
    },
    findOne: jest.fn().mockResolvedValue(opts.booking ?? null),
  };
  return service;
}

describe('LabsService technicians (R7-3)', () => {
  it('lists the lab’s linked staff with live names', async () => {
    const service = serviceFor({
      accounts: [{ id: 'acc-1', user_id: 'tech-1', email: 't@lab.test', role: 'technician' }],
      users: [{ id: 'tech-1', full_name: 'فني حقيقي' }],
    });
    const out = await service.listTechnicians({ id: 'lab-1', role: 'lab' });
    expect(out).toEqual([{ id: 'tech-1', account_id: 'acc-1', name: 'فني حقيقي', role: 'technician', status: undefined }]);
  });

  it('refuses to assign an outsider as technician', async () => {
    const booking = { id: 'b-1', provider_account_id: 'lab-1', save: jest.fn() };
    const service = serviceFor({ accounts: [], booking });
    service.listTechnicians = jest.fn().mockResolvedValue([]);
    await expect(service.assignTechnician('b-1', { id: 'lab-1', role: 'lab' }, { technician_id: 'stranger-9' }))
      .rejects.toThrow(new ForbiddenException('technician_not_on_team'));
  });

  it('rejects zero/missing GPS coordinates', async () => {
    const booking = { id: 'b-1', provider_account_id: 'lab-1', save: jest.fn() };
    const service = serviceFor({ booking });
    await expect(service.updateGps('b-1', { id: 'lab-1', role: 'lab' }, { lat: 0, lng: 0 })).rejects.toThrow(BadRequestException);
    await expect(service.updateGps('b-1', { id: 'lab-1', role: 'lab' }, {})).rejects.toThrow(BadRequestException);
  });
});
