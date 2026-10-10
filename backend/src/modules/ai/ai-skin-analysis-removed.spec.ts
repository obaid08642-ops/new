import 'reflect-metadata';

// D-4: AI skin analysis is removed (owner decision).
// POST /api/v1/ai/skin-analysis must not exist for any caller.
describe('D-4 skin analysis removed', () => {
  it('AiController exposes no skin-analysis route', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AiController } = require('./ai.controller');
    const proto = AiController.prototype as any;
    expect(typeof proto.skinAnalysis).toBe('undefined');
    const paths: string[] = [];
    for (const name of Object.getOwnPropertyNames(proto)) {
      try {
        const p = Reflect.getMetadata('path', proto[name]);
        if (typeof p === 'string') paths.push(p);
        if (Array.isArray(p)) paths.push(...p);
      } catch {
        /* ignore */
      }
    }
    expect(paths.join('|')).not.toContain('skin-analysis');
  });
});
