import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProviderOpsService } from './provider-ops.module';

function setup({ assigned = 'ambulance-1', state = 'ON_SCENE' }: { assigned?: string; state?: string } = {}) {
  const accounts = { findOne: jest.fn().mockResolvedValueOnce({ id: 'ambulance-1', provider_type: 'ambulance', status: 'approved' }).mockResolvedValueOnce({ id: 'hospital-1', provider_type: 'hospital', status: 'approved' }) };
  const emergency = { findOne: jest.fn().mockResolvedValue({ id: 'mission-1', assigned_ambulance_id: assigned, state, fare: 180, location: { lat: 24.7, lng: 46.7 } }), updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
  const audit = { insertOne: jest.fn().mockResolvedValue({}) };
  const conn = { collection: jest.fn((name: string) => name === 'provider_accounts' ? accounts : name === 'emergency_requests' ? emergency : name === 'audit_logs' ? audit : { findOne: jest.fn(), updateOne: jest.fn(), insertOne: jest.fn() }) };
  return { service: new ProviderOpsService(conn as any), emergency, audit };
}

describe('ProviderOpsService ambulance authority', () => {
  const ambulanceUser = { id: 'ambulance-1', role: 'ambulance' };

  it('rejects a handover from an ambulance not assigned to the mission', async () => {
    const { service, emergency } = setup({ assigned: 'ambulance-other' });
    await expect(service.ambulanceHandover(ambulanceUser, 'mission-1', { hospital_provider_account_id: 'hospital-1' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(emergency.updateOne).not.toHaveBeenCalled();
  });

  it('requires an approved receiving hospital and writes an audited state transition', async () => {
    const { service, emergency, audit } = setup();
    const result = await service.ambulanceHandover(ambulanceUser, 'mission-1', { hospital_provider_account_id: 'hospital-1', notes: 'handover note' });
    expect(result.state).toBe('HANDED_OVER');
    expect(result.handover_reference).toContain('handover:mission-1:');
    expect(emergency.updateOne).toHaveBeenCalledWith(expect.objectContaining({ id: 'mission-1', state: 'ON_SCENE' }), expect.objectContaining({ $set: expect.objectContaining({ state: 'HANDED_OVER' }) }));
    expect(audit.insertOne).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'clinical_handover', resource_id: 'mission-1' }));
  });

  it('rejects completion until a previous server-recorded handover exists', async () => {
    const { service, emergency } = setup({ state: 'ON_SCENE' });
    await expect(service.ambulanceComplete(ambulanceUser, 'mission-1', { summary: 'x', outcome: 'x' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(emergency.updateOne).not.toHaveBeenCalled();
  });
});
