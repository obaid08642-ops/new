// R11 independent check (on bc590b68): both socket gateways verified the JWT
// themselves and skipped everything else JwtAuthGuard does: the admin gate and
// device lock (an admin token on the realtime socket joined role:admin and got
// every order and appointment event), the impersonation-session check (a
// revoked support session kept its socket), and the token_version check (a
// banned user's token kept connecting for up to an hour). Sockets now run the
// same JwtAuthGuard on the handshake.
import { authenticateSocketToken } from './auth.guard';

describe('sockets authenticate through JwtAuthGuard (R11)', () => {
  it('returns the user only when the guard accepts, and passes the handshake headers and token', async () => {
    const seen: any[] = [];
    const guard: any = { canActivate: jest.fn(async (ctx: any) => { const req = ctx.switchToHttp().getRequest(); seen.push(req); req.user = { id: 'u1', role: 'patient' }; return true; }) };
    await expect(authenticateSocketToken(guard, 'tok', { 'x-admin-device': 'd' }, '10.0.0.1')).resolves.toEqual({ id: 'u1', role: 'patient' });
    expect(seen[0].headers.authorization).toBe('Bearer tok');
    expect(seen[0].headers['x-admin-device']).toBe('d');
  });

  it('any guard refusal (gate, device, revoked session, stale tv) means no socket', async () => {
    const guard: any = { canActivate: jest.fn(async () => { throw new Error('admin_gate_required'); }) };
    await expect(authenticateSocketToken(guard, 'tok', {})).resolves.toBeNull();
  });
});
