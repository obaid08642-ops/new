import { ServiceUnavailableException } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';

describe('F21: AI fails closed without a provider key', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  it('generate() → 503 ai_provider_unavailable when no provider key is configured (never an empty 201)', async () => {
    for (const k of Object.keys(process.env)) if (/_API_KEY$/.test(k)) delete process.env[k];
    const conn: any = { collection: () => ({ findOne: async () => null }) };
    const svc = new AiProviderService(conn);
    await expect(svc.generate({ prompt: 'hi' } as any)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(svc.generate({ prompt: 'hi' } as any)).rejects.toThrow('ai_provider_unavailable');
  });
});
