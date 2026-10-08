/**
 * Phase 0.2 (13.R21): SupportService.aiAssist ↔ AiGatewayService integration.
 * AiGatewayService is mocked; SupportRequestRepository.create is mocked.
 */
import { SupportService } from './support.service';

const user = { id: 'u1', full_name: 'Test User', phone: '0500000000', role: 'patient' };

function build() {
  const created: any[] = [];
  const req: any = {
    create: jest.fn(async (doc: any) => {
      created.push(doc);
      return { toObject: () => ({ id: 'T-HANDOFF-1', ...doc }) };
    }),
  };
  const settings: any = {};
  const conn: any = {};
  const ai: any = { generate: jest.fn() };
  const svc = new SupportService(req, settings, conn, ai);
  return { svc, req, ai, created };
}

describe('SupportService.aiAssist (P22 Phase 0.2)', () => {
  it('answer path: returns gateway text, creates no ticket', async () => {
    const { svc, req, ai } = build();
    ai.generate.mockResolvedValue({ text: 'Your appointment is at 3pm.', provider: 'groq', model: 'm', elapsed_ms: 5, fell_back: false });
    const out = await svc.aiAssist(user, { query: 'When is my appointment?' });
    expect(out.answer).toBe('Your appointment is at 3pm.');
    expect(out.handoff).toBeUndefined();
    expect(out.ticket_id).toBeUndefined();
    expect(ai.generate).toHaveBeenCalledTimes(1);
    expect(req.create).not.toHaveBeenCalled();
  });

  it('answer path: strips PII before calling the gateway', async () => {
    const { svc, ai } = build();
    ai.generate.mockResolvedValue({ text: 'ok', provider: 'groq', model: 'm', elapsed_ms: 1, fell_back: false });
    await svc.aiAssist(user, { query: 'My phone is 0551234567 and mail a@b.com, where is the clinic?' });
    const prompt = String(ai.generate.mock.calls[0][0].prompt);
    expect(prompt).not.toContain('0551234567');
    expect(prompt).not.toContain('a@b.com');
  });

  it('keyword handoff path: creates AI_HANDOFF/high ticket without calling gateway', async () => {
    const { svc, req, ai, created } = build();
    const out = await svc.aiAssist(user, { query: 'I want to talk to human please' });
    expect(out.handoff).toBe(true);
    expect(out.ticket_id).toBe('T-HANDOFF-1');
    expect(ai.generate).not.toHaveBeenCalled();
    expect(req.create).toHaveBeenCalledTimes(1);
    expect(created[0].category).toBe('AI_HANDOFF');
    expect(created[0].priority).toBe('high');
  });

  it('uncertain gateway answer path: hands off with ticket', async () => {
    const { svc, req, ai, created } = build();
    ai.generate.mockResolvedValue({ text: "I'm not sure, please contact support.", provider: 'groq', model: 'm', elapsed_ms: 1, fell_back: false });
    const out = await svc.aiAssist(user, { query: 'What does this lab result mean?' });
    expect(out.handoff).toBe(true);
    expect(out.ticket_id).toBe('T-HANDOFF-1');
    expect(out.answer).toContain("I'm not sure");
    expect(req.create).toHaveBeenCalledTimes(1);
    expect(created[0].category).toBe('AI_HANDOFF');
  });

  it('gateway-failure fallback path: static message, no ticket', async () => {
    const { svc, req, ai } = build();
    ai.generate.mockRejectedValue(new Error('ai_provider_unavailable'));
    const out = await svc.aiAssist(user, { query: 'Where is the pharmacy?' });
    expect(out.answer).toBe(SupportService.AI_FALLBACK);
    expect(out.handoff).toBeUndefined();
    expect(out.ticket_id).toBeUndefined();
    expect(req.create).not.toHaveBeenCalled();
  });

  it('missing gateway (manual construction): falls back without ticket', async () => {
    const req: any = { create: jest.fn() };
    const svc = new SupportService(req, {} as any, {} as any);
    const out = await svc.aiAssist(user, { query: 'Hello?' });
    expect(out.answer).toBe(SupportService.AI_FALLBACK);
    expect(req.create).not.toHaveBeenCalled();
  });
});
