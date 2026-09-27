import { loginCredentials } from './login-credentials';

describe('loginCredentials', () => {
  it('sends an email as identifier, never +966-prefixed', () => {
    expect(loginCredentials(' User@Mail.com ', 'pw')).toEqual({ identifier: 'user@mail.com', password: 'pw' });
  });
  it('normalizes a local phone to +966', () => {
    expect(loginCredentials('0551234567', 'pw')).toEqual({ phone: '+966551234567', password: 'pw' });
  });
  it('keeps an international phone', () => {
    expect(loginCredentials('+201001234567', 'pw')).toEqual({ phone: '+201001234567', password: 'pw' });
  });
});
