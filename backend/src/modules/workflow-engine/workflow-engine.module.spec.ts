import { BadRequestException } from '@nestjs/common';
import { toUniversal } from './workflow-engine.module';

describe('Workflow state mapping', () => {
  it('rejects an unknown domain state instead of treating it as REQUESTED', () => {
    expect(() => toUniversal('pharmacy', 'unexpected_state')).toThrow(BadRequestException);
  });

  it('maps declared states deterministically', () => {
    expect(toUniversal('pharmacy', 'accepted')).toBe('CONFIRMED');
    expect(toUniversal('consultation', 'scheduled')).toBe('CONFIRMED');
  });
});
