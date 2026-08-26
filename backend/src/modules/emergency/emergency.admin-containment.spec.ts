import { ServiceUnavailableException } from '@nestjs/common';
import { EmergencyController } from './emergency.controller';

describe('EmergencyController admin containment', () => {
  const controller = new EmergencyController({ active: jest.fn(), getById: jest.fn(), assign: jest.fn(), autoDispatch: jest.fn(), resolve: jest.fn() } as any);

  it('fails closed before exposing, assigning, dispatching or resolving emergency records from the admin surface', () => {
    expect(() => controller.active()).toThrow(ServiceUnavailableException);
    expect(() => controller.one('emergency-1')).toThrow(ServiceUnavailableException);
    expect(() => controller.assign('emergency-1', { hospital_id: 'hospital-1' }, { id: 'admin-1' })).toThrow(ServiceUnavailableException);
    expect(() => controller.autoDispatch('emergency-1', { id: 'admin-1' })).toThrow(ServiceUnavailableException);
    expect(() => controller.resolve('emergency-1', { id: 'admin-1' }, { notes: 'done' })).toThrow(ServiceUnavailableException);
  });
});
