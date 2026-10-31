import { audioOnlyAdvice, chooseTransport, isWeakLink, maxCallsPerHost, p2pEnabled } from './call-transport';
import { LiveKitService } from './livekit.service';

jest.mock('../legal/telehealth-consent', () => ({ assertTelehealthConsent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../chat/consultation-window', () => ({ isOnlineConsultation: () => true }));

describe('call transport decisions', () => {
  it('is off unless CALLS_P2P_ENABLED is set; group calls and flag-off calls stay on LiveKit', () => {
    expect(p2pEnabled({})).toBe(false);
    expect(chooseTransport({ participants: 2, env: {} })).toBe('livekit');
    expect(chooseTransport({ participants: 2, env: { CALLS_P2P_ENABLED: 'true' } })).toBe('p2p');
    expect(chooseTransport({ participants: 3, env: { CALLS_P2P_ENABLED: 'true' } })).toBe('livekit');
  });

  it('flags a weak link and server pressure as audio only', () => {
    expect(isWeakLink({ packet_loss: 0.12 })).toBe(true);
    expect(isWeakLink({ rtt_ms: 700 })).toBe(true);
    expect(isWeakLink({ bitrate_kbps: 80 })).toBe(true);
    expect(isWeakLink({ packet_loss: 0.01, rtt_ms: 80, bitrate_kbps: 1500 })).toBe(false);
    expect(audioOnlyAdvice({ activeCalls: 5, env: {} })).toEqual({ audio_only: false, reason: null });
    expect(audioOnlyAdvice({ activeCalls: 300, env: {} })).toEqual({ audio_only: true, reason: 'server_pressure' });
    expect(audioOnlyAdvice({ activeCalls: 1, sample: { packet_loss: 0.5 }, env: {} })).toEqual({ audio_only: true, reason: 'weak_link' });
    expect(maxCallsPerHost({})).toBe(1);
    expect(maxCallsPerHost({ CALLS_MAX_PER_HOST: '3' })).toBe(3);
  });
});

describe('LiveKitService with the P2P flag', () => {
  const appt = { id: 'appt-1', patient_id: 'patient-1', doctor_user_id: 'doctor-1', service_type: 'video', status: 'CONFIRMED' };
  const events = { emit: jest.fn() };
  let sessions: any;
  let service: LiveKitService;

  const build = () => {
    const appointments = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(appt) }) } as any;
    const conn = { collection: jest.fn(() => sessions) } as any;
    return new LiveKitService(appointments, conn, events as any);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LIVEKIT_API_KEY = 'k';
    process.env.LIVEKIT_API_SECRET = 'secret-secret-secret-secret-secret';
    process.env.COTURN_HOST = 'turn.example';
    process.env.COTURN_SECRET = 'turn-secret';
    sessions = {
      countDocuments: jest.fn().mockResolvedValue(0),
      insertOne: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
    };
    service = build();
  });
  afterEach(() => {
    delete process.env.CALLS_P2P_ENABLED; delete process.env.COTURN_HOST; delete process.env.COTURN_SECRET; delete process.env.CALLS_MAX_PER_HOST;
  });

  it('flag off: LiveKit token; the relay servers are returned for Room.connect too', async () => {
    const r: any = await service.initiateCall('patient-1', 'P', '', 'video', 'appt-1');
    expect(r.transport).toBe('livekit');
    expect(typeof r.token).toBe('string');
    expect(r.ice_servers).toHaveLength(2);
    expect(sessions.insertOne.mock.calls[0][0].transport).toBe('livekit');
  });

  it('flag on: P2P session without a LiveKit token, with STUN/TURN for the caller', async () => {
    process.env.CALLS_P2P_ENABLED = 'true';
    const r: any = await service.initiateCall('patient-1', 'P', '', 'video', 'appt-1', true);
    expect(r.transport).toBe('p2p');
    expect(r.token).toBeNull();
    expect(r.ice_servers).toHaveLength(2);
    expect(r.ice_servers[1].username).toMatch(/^\d+:[0-9a-f-]{36}$/);
    expect(r.ice_servers[1].username).not.toContain('patient-1');
    expect(JSON.stringify(r.ice_servers)).not.toContain('turn-secret');
    expect(sessions.insertOne.mock.calls[0][0].transport).toBe('p2p');
  });

  it('Cloudflare relay entries come first, our coturn second; a Cloudflare failure leaves coturn alone', async () => {
    const { cloudflareTurn } = await import('../coturn/cloudflare-turn.service');
    const cf = { urls: ['turns:turn.cloudflare.com:443?transport=tcp'], username: 'cfu', credential: 'cfc' };
    const spy = jest.spyOn(cloudflareTurn, 'iceServers').mockResolvedValueOnce([cf]);
    const r: any = await service.initiateCall('patient-1', 'P', '', 'video', 'appt-1');
    expect(r.ice_servers[0]).toEqual(cf);
    expect(r.ice_servers).toHaveLength(3);
    spy.mockResolvedValueOnce([]);
    const r2: any = await service.initiateCall('patient-1', 'P', '', 'video', 'appt-1');
    expect(r2.ice_servers).toHaveLength(2);
    spy.mockRestore();
  });

  it('flag on but the caller does not declare P2P support: LiveKit', async () => {
    process.env.CALLS_P2P_ENABLED = 'true';
    const r: any = await service.initiateCall('patient-1', 'P', '', 'video', 'appt-1');
    expect(r.transport).toBe('livekit');
    expect(typeof r.token).toBe('string');
  });

  it('answers provider_busy (409) when the host is already in a call, and asks only about other appointments', async () => {
    sessions.countDocuments.mockResolvedValueOnce(1);
    await expect(service.initiateCall('patient-1', 'P', '', 'video', 'appt-1')).rejects.toMatchObject({ status: 409, response: { code: 'provider_busy' } });
    const q = sessions.countDocuments.mock.calls[0][0];
    expect(q.provider_id).toBe('doctor-1');
    expect(q.appointment_id).toEqual({ $ne: 'appt-1' });
    expect(sessions.insertOne).not.toHaveBeenCalled();
  });

  it('join on a P2P session returns ICE servers and no token; audio only advised under server pressure', async () => {
    sessions.findOne.mockResolvedValue({ id: 'call_1', patient_id: 'patient-1', provider_id: 'doctor-1', room_name: 'room-1', status: 'INITIATED', transport: 'p2p', appointment_id: 'appt-1' });
    sessions.countDocuments.mockResolvedValue(500);
    const r: any = await service.joinCall('call_1', 'doctor-1', 'Dr', true);
    expect(r.transport).toBe('p2p');
    expect(r.token).toBeNull();
    expect(r.audio_only).toBe(true);
    expect(r.audio_only_reason).toBe('server_pressure');
  });

  it('a joiner without P2P support moves the call to LiveKit and tells the caller', async () => {
    sessions.findOne.mockResolvedValue({ id: 'call_1', patient_id: 'patient-1', provider_id: 'doctor-1', room_name: 'room-1', status: 'INITIATED', transport: 'p2p', appointment_id: 'appt-1' });
    const r: any = await service.joinCall('call_1', 'doctor-1', 'Dr');
    expect(r.transport).toBe('livekit');
    expect(typeof r.token).toBe('string');
    expect(sessions.updateOne.mock.calls[0][1].$set).toMatchObject({ transport: 'livekit', fallback_reason: 'unsupported' });
    expect(events.emit).toHaveBeenCalledWith('call.transport', expect.objectContaining({ callee_id: 'patient-1', reason: 'unsupported' }));
  });

  it('fallback moves the call to LiveKit, hands out a token and tells the other side', async () => {
    sessions.findOne.mockResolvedValue({ id: 'call_1', patient_id: 'patient-1', provider_id: 'doctor-1', room_name: 'room-1', status: 'ACTIVE', transport: 'p2p' });
    const r: any = await service.fallbackToLiveKit('call_1', 'patient-1', 'ice_failed');
    expect(r.transport).toBe('livekit');
    expect(typeof r.token).toBe('string');
    expect(sessions.updateOne.mock.calls[0][1].$set).toMatchObject({ transport: 'livekit', fallback_reason: 'ice_failed' });
    expect(events.emit).toHaveBeenCalledWith('call.transport', expect.objectContaining({ callee_id: 'doctor-1', transport: 'livekit' }));
  });

  it('metrics: a weak link advises audio only', async () => {
    sessions.findOne.mockResolvedValue({ id: 'call_1', patient_id: 'patient-1', provider_id: 'doctor-1', room_name: 'room-1', status: 'ACTIVE' });
    const r: any = await service.saveMetrics('call_1', 'patient-1', [{ packet_loss: 0.01 }, { packet_loss: 0.3, rtt_ms: 900 }]);
    expect(r).toEqual({ success: true, audio_only: true, audio_only_reason: 'weak_link' });
  });

  it('relayed bytes: each side stores its own count (a repeat replaces), and the month total is logged', async () => {
    sessions.findOne.mockResolvedValue({ id: 'call_1', patient_id: 'patient-1', provider_id: 'doctor-1', room_name: 'room-1', status: 'ACTIVE' });
    sessions.aggregate = jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ bytes: 2_500_000_000, calls: ['a', 'b'] }]) });
    const log = jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    await service.reportPath('call_1', 'patient-1', 'relay', 1_200_000.9);
    expect(sessions.updateOne.mock.calls.at(-1)[1].$set).toMatchObject({ media_path: 'relay', 'relayed_bytes_by.patient-1': 1_200_000 });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('relayed_bytes=1200000 month_total_gb=2.500 of 1000 free (calls with relay: 2)'));
    await service.reportPath('call_1', 'patient-1', 'direct', 5);                       // a direct path counts nothing
    expect(Object.keys(sessions.updateOne.mock.calls.at(-1)[1].$set).some((k) => k.startsWith('relayed_bytes_by'))).toBe(false);
    await service.reportPath('call_1', 'patient-1', 'relay');                            // no number reported: nothing stored
    expect(Object.keys(sessions.updateOne.mock.calls.at(-1)[1].$set).some((k) => k.startsWith('relayed_bytes_by'))).toBe(false);
  });

  it('CALLS_TURN_PROVIDER=coturn drops Cloudflare without a deploy', async () => {
    const { CloudflareTurnService } = await import('../coturn/cloudflare-turn.service');
    process.env.CF_TURN_KEY_ID = 'k'; process.env.CF_TURN_API_TOKEN = 't';
    try {
      expect(new CloudflareTurnService().isConfigured()).toBe(true);
      process.env.CALLS_TURN_PROVIDER = 'coturn';
      expect(new CloudflareTurnService().isConfigured()).toBe(false);
      process.env.CALLS_TURN_PROVIDER = 'cloudflare';
      expect(new CloudflareTurnService().isConfigured()).toBe(true);
    } finally { delete process.env.CF_TURN_KEY_ID; delete process.env.CF_TURN_API_TOKEN; delete process.env.CALLS_TURN_PROVIDER; }
  });
});
