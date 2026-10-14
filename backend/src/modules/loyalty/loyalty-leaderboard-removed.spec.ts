import 'reflect-metadata';

// D-2: the loyalty leaderboard route is removed (owner decision).
// GET /api/v1/loyalty/leaderboard must not exist for any caller.
describe('D-2 leaderboard removed', () => {
  it('LoyaltyController exposes no leaderboard route', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LoyaltyController } = require('./loyalty.controller');
    const proto = LoyaltyController.prototype as any;
    expect(typeof proto.getLeaderboard).toBe('undefined');
    const paths: string[] = [];
    const prefix = Reflect.getMetadata('path', LoyaltyController);
    void prefix;
    // scan method-level path metadata for the string 'leaderboard'
    for (const name of Object.getOwnPropertyNames(proto)) {
      const p = Reflect.getMetadata('path', proto[name]);
      if (typeof p === 'string') paths.push(p);
      if (Array.isArray(p)) paths.push(...p);
    }
    expect(paths.join('|')).not.toContain('leaderboard');
  });
});
