import { EmergencyController } from './emergency.controller';

// The admin emergency surface is live and guarded (JwtAuthGuard + ADMIN role
// on the controller). These tests pin delegation to the service layer —
// the previous containment spec asserted disabled endpoints that have since
// been legitimately implemented.
describe('EmergencyController admin surface', () => {
  const svc = {
    active: jest.fn(),
    getById: jest.fn(),
    assign: jest.fn(),
    autoDispatch: jest.fn(),
    resolve: jest.fn(),
  };
  const controller = new EmergencyController(svc as any);

  it('delegates reads and mutations to the emergency service', async () => {
    await controller.active();
    expect(svc.active).toHaveBeenCalled();
    await controller.one('emergency-1');
    expect(svc.getById).toHaveBeenCalledWith('emergency-1');
    await controller.assign('emergency-1', { hospital_id: 'hospital-1' }, { id: 'admin-1' });
    expect(svc.assign).toHaveBeenCalled();
    await controller.autoDispatch('emergency-1', { id: 'admin-1' });
    expect(svc.autoDispatch).toHaveBeenCalled();
    await controller.resolve('emergency-1', { id: 'admin-1' }, { notes: 'done' });
    expect(svc.resolve).toHaveBeenCalled();
  });
});
