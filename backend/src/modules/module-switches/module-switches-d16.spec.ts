/** D-16: module switches — mapping, admin bypass, validation, default ON. */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ModuleSwitchesService } from './module-switches.service';

const svcWith = (rows: any[] = []) => {
  const coll = {
    find: () => ({ toArray: async () => rows }),
    updateOne: async () => ({ modifiedCount: 1 }),
  };
  const conn: any = { db: { collection: () => coll } };
  return new ModuleSwitchesService(conn);
};

describe('D-16 module switches', () => {
  it('maps sample routes to their modules', () => {
    const m = ModuleSwitchesService.moduleFor;
    expect(m('/api/v1/patient/pharmacy/orders')).toBe('pharmacy');
    expect(m('/api/v1/pharmacy/chat/threads')).toBe('pharmacy');
    expect(m('/api/v1/care/doctors')).toBe('consultations');
    expect(m('/api/v1/consultations/x-1')).toBe('consultations');
    expect(m('/api/v1/labs/services')).toBe('labs_radiology');
    expect(m('/api/v1/radiology/bookings/mine')).toBe('labs_radiology');
    expect(m('/api/v1/nursing/visits/x/tracking')).toBe('nursing');
    expect(m('/api/v1/home-care/services')).toBe('nursing');
    expect(m('/api/v1/users/me/insurance')).toBe('insurance');
    expect(m('/api/v1/articles')).toBe('articles');
    expect(m('/api/v1/modules')).toBeNull();
    expect(m('/api/v1/users/me')).toBeNull();
  });

  it('admin routes are never blocked', () => {
    expect(ModuleSwitchesService.isAdminRoute('/api/v1/admin/modules/loyalty')).toBe(true);
    expect(ModuleSwitchesService.isAdminRoute('/api/v1/labs/admin/catalog')).toBe(true);
    expect(ModuleSwitchesService.isAdminRoute('/api/v1/care/doctors')).toBe(false);
  });

  it('defaults ON; stored OFF is honored', async () => {
    expect(await svcWith().isEnabled('loyalty')).toBe(true);
    expect(await svcWith([{ key: 'loyalty', enabled: false }]).isEnabled('loyalty')).toBe(false);
  });

  it('rejects unknown keys and short reasons', async () => {
    const svc = svcWith();
    await expect(svc.set('no_such_module', false, 'reason here')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.set('loyalty', false, 'no')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.set('loyalty', 'x' as any, 'valid reason')).rejects.toBeInstanceOf(BadRequestException);
  });
});
