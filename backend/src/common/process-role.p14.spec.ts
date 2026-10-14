import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Interval } from '@nestjs/schedule';
import { backgroundImports, backgroundProviders, processRole, runsBackgroundWork } from './process-role';

/**
 * P14.26: an API process runs no scheduled job and no queue consumer; the worker role (and `all`, the dev default)
 * runs them. Proven with a real ScheduleModule and a real @Interval job, the same helpers AppModule uses.
 */
let ticks = 0;
@Injectable()
class TickJob {
  @Interval(20)
  tick() { ticks++; }
}
class Consumer {}

async function boot(role: string | undefined) {
  const env = { PROCESS_ROLE: role } as NodeJS.ProcessEnv;
  @Module({ imports: [...backgroundImports(env)], providers: [TickJob, ...backgroundProviders([Consumer], env)] })
  class M {}
  const app = await Test.createTestingModule({ imports: [M] }).compile();
  const ctx = app.createNestApplication();
  await ctx.init();
  ticks = 0;
  await new Promise((r) => setTimeout(r, 150));
  const seen = ticks;
  const hasConsumer = (() => { try { ctx.get(Consumer); return true; } catch { return false; } })();
  await ctx.close();
  return { seen, hasConsumer };
}

describe('process role (P14.26)', () => {
  it('reads PROCESS_ROLE, defaulting to all', () => {
    expect(processRole({} as NodeJS.ProcessEnv)).toBe('all');
    expect(processRole({ PROCESS_ROLE: ' API ' } as NodeJS.ProcessEnv)).toBe('api');
    expect(processRole({ PROCESS_ROLE: 'worker' } as NodeJS.ProcessEnv)).toBe('worker');
    expect(processRole({ PROCESS_ROLE: 'nonsense' } as NodeJS.ProcessEnv)).toBe('all');
    expect(runsBackgroundWork({ PROCESS_ROLE: 'api' } as NodeJS.ProcessEnv)).toBe(false);
  });

  it('an api process runs no scheduled job and registers no queue consumer', async () => {
    const r = await boot('api');
    expect(r.seen).toBe(0);
    expect(r.hasConsumer).toBe(false);
  });

  it.each(['worker', undefined])('role %s runs the jobs and the consumers', async (role) => {
    const r = await boot(role);
    expect(r.seen).toBeGreaterThan(0);
    expect(r.hasConsumer).toBe(true);
  });
});
