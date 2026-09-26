import { ServiceUnavailableException } from '@nestjs/common';
import { AdminGovernanceController } from './admin-governance.controller';

describe('AdminGovernanceController emergency maintenance containment', () => {
  it('fails closed without mutating configuration when the audited infrastructure command is unavailable', async () => {
    const configModel: any = { findOneAndUpdate: jest.fn() };
    const controller = new AdminGovernanceController(configModel, {} as any, {} as any);
    await expect(controller.triggerEmergencyMaintenance({ id: 'admin-1', role: 'admin' }, { forceMaintenanceState: true })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(configModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
