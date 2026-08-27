import { ServiceUnavailableException } from '@nestjs/common';
import { AiController } from './ai.controller';

describe('AiController admin containment', () => {
  const controller = new AiController({} as any, { listProviders: jest.fn(), updateProvider: jest.fn(), setMode: jest.fn(), usageReport: jest.fn() } as any);

  it('fails closed before exposing or mutating administrative AI routing state', () => {
    expect(() => controller.gatewayStatus()).toThrow(ServiceUnavailableException);
    expect(() => controller.updateProvider('openai', { enabled: false })).toThrow(ServiceUnavailableException);
    expect(() => controller.setMode({ mode: 'manual', pinned: 'openai' })).toThrow(ServiceUnavailableException);
    expect(() => controller.usage('7')).toThrow(ServiceUnavailableException);
  });
});
