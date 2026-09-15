import { AiGatewayService } from './ai-gateway.service';

describe('AiGatewayService purpose overrides', () => {
  const svc = (settingsDoc: any, providers: any[] = [{ key: 'groq' }, { key: 'gemini' }]) => {
    const conn: any = {
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'featureflags') {
          return {
            findOne: jest.fn().mockResolvedValue(settingsDoc),
            updateOne: jest.fn().mockResolvedValue({}),
          };
        }
        return {
          countDocuments: jest.fn().mockResolvedValue(providers.length),
          find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(providers) }) }),
          findOne: jest.fn().mockImplementation((q: any) => Promise.resolve(providers.find((p) => p.key === q.key) || null)),
          updateOne: jest.fn().mockResolvedValue({}),
        };
      }),
    };
    return new AiGatewayService(conn);
  };

  it('rejects empty feature and unknown provider without touching DB writes', async () => {
    const s: any = svc({ value: 'auto' });
    await expect(s.setPurposeOverride('', 'groq')).rejects.toThrow('feature_required');
    await expect(s.setPurposeOverride('triage', 'nope' as any)).rejects.toThrow('unknown_provider');
  });

  it('clears an override with null', async () => {
    const updateOne = jest.fn().mockResolvedValue({});
    const conn: any = {
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'featureflags') {
          return { findOne: jest.fn().mockResolvedValue({ value: 'auto', purpose_overrides: { triage: 'groq' } }), updateOne };
        }
        return { countDocuments: jest.fn().mockResolvedValue(1), findOne: jest.fn(), find: jest.fn(), updateOne: jest.fn().mockResolvedValue({}) };
      }),
    };
    const s = new AiGatewayService(conn);
    const out: any = await s.setPurposeOverride('triage', null);
    expect(out.provider).toBeNull();
    expect(updateOne).toHaveBeenCalledWith({ key: 'ai_mode' }, expect.objectContaining({ $unset: expect.anything() }), expect.anything());
  });
});
