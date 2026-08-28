import { getWebSocketCorsOptions } from './websocket-cors';

describe('WebSocket CORS policy', () => {
  const originalEnv = { ...process.env };
  afterEach(() => { process.env = { ...originalEnv }; });

  it('fails closed for staging without an explicit allowlist', () => {
    process.env.NODE_ENV = 'staging';
    delete process.env.ALLOWED_ORIGINS;
    expect(() => getWebSocketCorsOptions()).toThrow('ALLOWED_ORIGINS is required');
  });

  it('rejects wildcard origins outside local environments', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = '*';
    expect(() => getWebSocketCorsOptions()).toThrow('wildcard ALLOWED_ORIGINS');
  });

  it('returns only the explicit trusted origins', () => {
    process.env.NODE_ENV = 'staging';
    process.env.ALLOWED_ORIGINS = 'https://patient.nabd.plus, https://provider.nabd.plus';
    expect(getWebSocketCorsOptions()).toEqual({
      origin: ['https://patient.nabd.plus', 'https://provider.nabd.plus'],
      credentials: true,
    });
  });
});
