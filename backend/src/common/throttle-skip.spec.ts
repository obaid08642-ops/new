import { shouldSkipThrottle } from './throttle-skip';

describe('throttler skip switch (live stack only)', () => {
  it('skips only when DISABLE_RATE_LIMIT=true outside production', () => {
    expect(shouldSkipThrottle({ DISABLE_RATE_LIMIT: 'true', NODE_ENV: 'development' } as never)).toBe(true);
    expect(shouldSkipThrottle({ DISABLE_RATE_LIMIT: 'true', NODE_ENV: 'production' } as never)).toBe(false);
    expect(shouldSkipThrottle({ NODE_ENV: 'development' } as never)).toBe(false);
  });
});
