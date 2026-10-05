// R11 §5 lead 17: the admin new-device / login alert emails put the device
// name, user agent and IP (all sent by whoever logs in) into HTML unescaped,
// so a login with stolen credentials could plant a link inside a "security"
// email to the real admin.
import { AuthService } from './auth.service';

describe('admin alert emails escape login-supplied text (R11 §5 lead 17)', () => {
  it('new-device alert', async () => {
    const sent: string[] = [];
    const svc = Object.create(AuthService.prototype) as Record<string, unknown>;
    svc.mail = { send: jest.fn(async (_to: string, _s: string, html: string) => { sent.push(html); return { ok: true }; }) };
    await (svc as unknown as { sendNewDeviceAlert: (u: unknown, d: unknown, ip?: string) => Promise<void> })
      .sendNewDeviceAlert({ email: 'admin@example.test' }, { name: '<a href="https://evil.example">secure your account</a>', user_agent: '<img src=x>' }, '1.2.3.4');
    expect(sent[0]).not.toContain('<a href="https://evil.example"');
    expect(sent[0]).not.toContain('<img');
    expect(sent[0]).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;');
  });
});
