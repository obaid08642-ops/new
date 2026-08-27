import { appointmentStatusRouteParams } from './consultation-status-route';

describe('appointment status route parameters', () => {
  it('uses only the server appointment id and recognised service type', () => {
    expect(appointmentStatusRouteParams({ id: 'appointment-1', service_type: 'home' }, 'appointment-1')).toEqual({ appointmentId: 'appointment-1', visitType: 'home' });
  });
  it('rejects an incorrect appointment identity or an unsupported service type instead of falling back to clinic', () => {
    expect(() => appointmentStatusRouteParams({ id: 'appointment-2', service_type: 'clinic' }, 'appointment-1')).toThrow('invalid');
    expect(() => appointmentStatusRouteParams({ id: 'appointment-1', service_type: 'unknown' }, 'appointment-1')).toThrow('invalid');
  });
});
