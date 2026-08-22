import { ForbiddenException } from '@nestjs/common';
import { ProviderRequestEngineService } from './provider-request-engine.service';

describe('ProviderRequestEngineService staff assignment roster', () => {
  const make = (request: any, staff: any) => {
    const requests: any = { findOne: jest.fn().mockResolvedValue(request) };
    const audit: any = { create: jest.fn().mockResolvedValue(undefined) };
    const operators: any = { findOne: jest.fn().mockResolvedValue(staff) };
    const service = new ProviderRequestEngineService(
      requests, audit, { createSystem: jest.fn() } as any, { onLifecycleEvent: jest.fn() } as any,
      { emit: jest.fn() } as any, { onProviderAccepted: jest.fn(), onProviderRejected: jest.fn() } as any, operators,
    );
    return { service, operators, audit };
  };

  it('assigns only an active operator from the request facility and records an audit entry', async () => {
    const request: any = { id: 'req-1', provider_account_id: 'facility-1', save: jest.fn(), toObject: jest.fn(() => ({ id: 'req-1' })) };
    const { service, operators, audit } = make(request, { id: 'staff-1', full_name: 'Staff A' });
    await expect(service.assignStaff({ id: 'facility-1', role: 'hospital' }, 'req-1', { staff_id: 'staff-1' })).resolves.toEqual({ id: 'req-1' });
    expect(operators.findOne).toHaveBeenCalledWith({ id: 'staff-1', provider_account_id: 'facility-1', status: 'active' });
    expect(request.assigned_staff_id).toBe('staff-1');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'request.staff_assigned', after: { assigned_staff_id: 'staff-1', assignment_roster_id: 'staff-1' } }));
  });

  it('fails closed when the supplied staff identity is not an active roster member', async () => {
    const request: any = { id: 'req-1', provider_account_id: 'facility-1', save: jest.fn(), toObject: jest.fn() };
    const { service } = make(request, null);
    await expect(service.assignStaff({ id: 'facility-1', role: 'hospital' }, 'req-1', { staff_id: 'foreign-staff' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(request.save).not.toHaveBeenCalled();
  });
});
