import { ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, Permission } from '../../../../common/permissions';
import { AdminGovernanceController } from './admin-governance.controller';

describe('AdminGovernanceController emergency maintenance (issues 955 / 995)', () => {
  const admin = { id: 'owner-1', role: 'super_admin' };

  it('hands the command to the kill-switch service with the reason and the acting admin', async () => {
    const switches: any = { setEmergency: jest.fn().mockResolvedValue({ active: true, reason: 'payment outage', message: 'emergency_maintenance_on' }) };
    const controller = new AdminGovernanceController({} as any, {} as any, {} as any, switches);
    const out = await controller.triggerEmergencyMaintenance(admin, { forceMaintenanceState: true, reason: 'payment outage' });
    expect(switches.setEmergency).toHaveBeenCalledWith(true, 'payment outage', admin);
    expect(out.active).toBe(true);
  });

  it('reads the real state (no hard-coded "online")', async () => {
    const switches: any = { emergencyState: jest.fn().mockResolvedValue({ active: true, reason: 'x', updated_by: 'owner-1', updated_at: null }) };
    const controller = new AdminGovernanceController({} as any, {} as any, {} as any, switches);
    await expect(controller.emergencyMaintenance()).resolves.toMatchObject({ active: true });
  });

  it('fails closed without the kill-switch service (nothing is claimed)', async () => {
    const configModel: any = { findOneAndUpdate: jest.fn() };
    const controller = new AdminGovernanceController(configModel, {} as any, {} as any);
    await expect(controller.triggerEmergencyMaintenance(admin, { forceMaintenanceState: true, reason: 'payment outage' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(configModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('both routes require modules.manage, the permission the admin page requires', () => {
    const reflector = new Reflector();
    const proto = AdminGovernanceController.prototype;
    expect(reflector.get(PERMISSIONS_KEY, proto.triggerEmergencyMaintenance)).toEqual([Permission.MODULES_MANAGE]);
    expect(reflector.get(PERMISSIONS_KEY, proto.emergencyMaintenance)).toEqual([Permission.MODULES_MANAGE]);
  });
});
