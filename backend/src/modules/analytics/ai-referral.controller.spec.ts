import { AiReferralController } from './ai-referral.controller';

describe('AiReferralController (C6.4)', () => {
  const makeController = () => {
    const referrals: any = { insertOne: jest.fn().mockResolvedValue({}), aggregate: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) };
    const conn: any = { collection: jest.fn().mockReturnValue(referrals) };
    const controller = new AiReferralController(conn);
    return { controller, referrals };
  };

  it('records referrals from known AI assistants', async () => {
    const { controller, referrals } = makeController();
    const res = await controller.record({ referrer: 'https://chat.openai.com/share/abc', path: '/ar/p/xyz' });
    expect(res).toEqual({ ok: true });
    expect(referrals.insertOne).toHaveBeenCalledWith(expect.objectContaining({ referrer: 'https://chat.openai.com/share/abc' }));
  });

  it.each([
    'https://perplexity.ai/search?q=x',
    'https://gemini.google.com/share/y',
    'https://copilot.microsoft.com/z',
    'https://claude.ai/chat/w',
  ])('records referral from %s', async (referrer) => {
    const { controller, referrals } = makeController();
    await controller.record({ referrer, path: '/' });
    expect(referrals.insertOne).toHaveBeenCalled();
  });

  it('rejects non-AI referrers without storing', async () => {
    const { controller, referrals } = makeController();
    const res = await controller.record({ referrer: 'https://google.com/search?q=x', path: '/' });
    expect(res).toEqual({ ok: false, reason: 'not_ai_referrer' });
    expect(referrals.insertOne).not.toHaveBeenCalled();
  });

  it('returns per-referrer stats for the admin report', async () => {
    const { controller } = makeController();
    const res = await controller.stats();
    expect(res).toEqual({ stats: [] });
  });
});
