// Q94 follow-up (Round 11 item 6): any account, guests included, got 24 h TURN
// credentials. Credentials are now only for a party of an active call
// session, valid about 10 minutes, never for guests.
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CoturnController } from './coturn.controller';
import { CoturnService } from './coturn.service';
import { NoGuestsGuard } from '../../common/auth.guard';

describe('TURN credentials only for a call party (Q94)', () => {
  const env = { ...process.env };
  beforeAll(() => { process.env.COTURN_HOST = 'turn.test'; process.env.COTURN_SECRET = 'unit-test-secret'; });
  afterAll(() => { process.env = env; });

  const sessions: Record<string, Record<string, string>> = {
    live: { id: 'live', patient_id: 'pat-1', provider_id: 'doc-1', status: 'ACTIVE' },
    ended: { id: 'ended', patient_id: 'pat-1', provider_id: 'doc-1', status: 'ENDED' },
  };
  const conn = { collection: jest.fn(() => ({ findOne: jest.fn(async (q: { id: { $eq: string } }) => sessions[q.id.$eq] ?? null) })) };
  const ctrl = () => new CoturnController(new CoturnService(conn as never));

  it('a party of an active session gets credentials valid at most 10 minutes', async () => {
    const c = await ctrl().getCredentials({ id: 'pat-1', role: 'patient' }, 'live');
    expect(c.ttl).toBeLessThanOrEqual(600);
    expect(c.username).toMatch(/:pat-1$/);
  });

  it('someone outside the session is refused', async () => {
    await expect(ctrl().getCredentials({ id: 'stranger', role: 'patient' }, 'live')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('an ended or unknown session, or no session id, is refused', async () => {
    await expect(ctrl().getCredentials({ id: 'pat-1', role: 'patient' }, 'ended')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(ctrl().getIceConfig({ id: 'pat-1', role: 'patient' }, 'nope')).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctrl().getCredentials({ id: 'pat-1', role: 'patient' }, undefined as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('guests are blocked at the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, CoturnController) as unknown[];
    expect(guards).toContain(NoGuestsGuard);
  });
});
