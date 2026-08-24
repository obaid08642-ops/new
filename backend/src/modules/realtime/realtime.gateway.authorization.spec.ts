import { RealtimeGateway } from './realtime.gateway';

const makeSocket = (user?: any): any => ({
  data: user ? { user } : {},
  join: jest.fn(),
  leave: jest.fn(),
});

const makeAppointment = (overrides: any = {}) => ({
  id: 'appt-1',
  patient_id: 'patient-1',
  booked_by_user_id: 'family-booker-1',
  doctor_user_id: 'doctor-user-1',
  doctor_id: 'doctor-profile-1',
  status: 'CONFIRMED',
  ...overrides,
});

describe('RealtimeGateway room authorization', () => {
  let gateway: RealtimeGateway;
  let appointments: any;

  beforeEach(() => {
    appointments = { findOne: jest.fn() };
    gateway = new RealtimeGateway(
      {} as any,
      { setServer: jest.fn(), setUserOnline: jest.fn(), setUserOffline: jest.fn() } as any,
      appointments,
      {} as any,
      {} as any,
    );
    (gateway as any).server = { to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() };
  });

  it('rejects a generic channel request without joining a caller-controlled room', () => {
    const socket = makeSocket({ id: 'patient-1' });
    expect(gateway.joinChannel(socket as any, { channel: 'admin:finance' })).toEqual({ ok: false, error: 'unsupported_channel' });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('rejects a foreign waiting-room join before the socket enters a room or queue', async () => {
    const socket = makeSocket({ id: 'patient-foreign' });
    appointments.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(makeAppointment()) });

    await expect(gateway.handleWaitingRoomJoin(socket as any, { appointmentId: 'appt-1' })).resolves.toEqual({ ok: false, error: 'not_participant' });
    expect(socket.join).not.toHaveBeenCalled();
    expect((gateway as any).doctorQueues.size).toBe(0);
  });

  it('allows only an appointment participant to enter an open waiting room', async () => {
    const socket = makeSocket({ id: 'patient-1' });
    appointments.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(makeAppointment()) });

    await expect(gateway.handleWaitingRoomJoin(socket as any, { appointmentId: 'appt-1' })).resolves.toEqual({ ok: true });
    expect(socket.join).toHaveBeenCalledWith('appointment:appt-1');
    expect(socket.data.appointmentId).toBe('appt-1');
    expect((gateway as any).doctorQueues.get('doctor-profile-1')).toEqual(['appt-1']);
  });

  it('rejects terminal appointments and foreign waiting-room leave without mutating the queue', async () => {
    const foreignSocket = makeSocket({ id: 'patient-foreign' });
    appointments.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(makeAppointment({ status: 'COMPLETED' })) });
    await expect(gateway.handleWaitingRoomJoin(foreignSocket as any, { appointmentId: 'appt-1' })).resolves.toEqual({ ok: false, error: 'not_participant' });
    expect(foreignSocket.join).not.toHaveBeenCalled();

    (gateway as any).doctorQueues.set('doctor-profile-1', ['appt-1']);
    appointments.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(makeAppointment()) });
    await expect(gateway.handleWaitingRoomLeave(foreignSocket as any, { appointmentId: 'appt-1' })).resolves.toEqual({ ok: false, error: 'not_participant' });
    expect(foreignSocket.leave).not.toHaveBeenCalled();
    expect((gateway as any).doctorQueues.get('doctor-profile-1')).toEqual(['appt-1']);
  });
});
