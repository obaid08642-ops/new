import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ShiftsService } from './facility-ops.module';

function serviceFor(opts: { account?: any; geo?: any; open?: any; radius?: number } = {}) {
  const service: any = Object.create(ShiftsService.prototype);
  const created: any[] = [];
  const attendanceUpdates: any[] = [];
  const collections: Record<string, any> = {
    provider_accounts: { findOne: jest.fn().mockResolvedValue(opts.account ?? null) },
    provider_profiles: { findOne: jest.fn().mockResolvedValue(opts.geo ? { geo: opts.geo } : null) },
    system_config: { findOne: jest.fn().mockResolvedValue({ key: 'system_config', value: { attendance_radius_m: opts.radius ?? 300 } }) },
    users: { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) },
  };
  service.shiftModel = { db: { collection: jest.fn((name: string) => collections[name] || { findOne: jest.fn().mockResolvedValue(null) }) } };
  service.attendanceModel = {
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(opts.open ?? null) }),
    create: jest.fn().mockImplementation(async (doc: any) => { created.push(doc); return doc; }),
    updateOne: jest.fn().mockImplementation(async (...args: any[]) => { attendanceUpdates.push(args); return {}; }),
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }),
  };
  service.conn = { collection: jest.fn((name: string) => collections[name]) };
  return { service, created, attendanceUpdates };
}

const STAFF = { id: 'doctor-1', role: 'doctor' };

describe('ShiftsService attendance (LJ-01)', () => {
  it('resolves the facility from provider_accounts.facility_id and records GPS check-in', async () => {
    const { service, created } = serviceFor({ account: { id: 'doctor-1', facility_id: 'facility-9' }, geo: { lat: 24.7, lng: 46.7 } });

    const out = await service.checkIn(STAFF, 24.7005, 46.7005);

    expect(created[0]).toMatchObject({ user_id: 'doctor-1', facility_id: 'facility-9', status: 'present' });
    expect(out.facility_id).toBe('facility-9');
  });

  it('refuses a second open attendance for the same person', async () => {
    const { service, created } = serviceFor({ account: { id: 'doctor-1', facility_id: 'facility-9' }, geo: { lat: 24.7, lng: 46.7 }, open: { id: 'att-1' } });
    await expect(service.checkIn(STAFF, 24.7, 46.7)).rejects.toThrow(new BadRequestException('already_checked_in'));
    expect(created).toHaveLength(0);
  });

  it('refuses a check-in outside the facility radius and without GPS', async () => {
    const { service } = serviceFor({ account: { id: 'doctor-1', facility_id: 'facility-9' }, geo: { lat: 24.7, lng: 46.7 } });
    await expect(service.checkIn(STAFF, 25.0, 47.0)).rejects.toThrow(new ForbiddenException('outside_facility_radius'));
    await expect(service.checkIn(STAFF)).rejects.toThrow(new BadRequestException('location_required'));
  });

  it('only lets the owner or the facility close a record', async () => {
    const record = { id: 'att-1', user_id: 'doctor-1', facility_id: 'facility-9', check_out_time: null };
    const stranger = serviceFor({ account: { id: 'doctor-2', facility_id: 'facility-1' } });
    stranger.service.attendanceModel.findOne.mockResolvedValue(record);
    await expect(stranger.service.checkOut({ id: 'doctor-2', role: 'doctor' }, 'att-1')).rejects.toThrow(ForbiddenException);

    const owner = serviceFor({ account: { id: 'doctor-1', facility_id: 'facility-9' } });
    owner.service.attendanceModel.findOne.mockResolvedValue(record);
    await expect(owner.service.checkOut(STAFF, 'att-1')).resolves.toMatchObject({ ok: true, id: 'att-1' });
  });
});
