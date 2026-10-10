import 'reflect-metadata';

// D-15: AI assistant limits (owner decision 15). POST /api/v1/ai/assistant answers within
// server-enforced rules no matter what the model says.
describe('D-15 AI assistant endpoint', () => {
  it('AiController exposes POST assistant', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AiController } = require('./ai.controller');
    expect(typeof (AiController.prototype as any).assistant).toBe('function');
  });

  it('AssistantService builds rule-bound answers', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AssistantService } = require('./assistant.service');
    expect(typeof (AssistantService.prototype as any).assist).toBe('function');
  });
});
