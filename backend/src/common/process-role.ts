import { DynamicModule, Provider } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

/**
 * P14.26: which work a backend process does.
 *  - `api`: serves HTTP and sockets only. No cron job, interval, queue consumer or index sync runs, so a cluster of
 *    API workers (main.ts) never runs the same job N times and a heavy job never slows a request.
 *  - `worker`: runs cron jobs, queue consumers and the search sync, once, in its own container (compose `worker`).
 *  - `all` (default, dev and tests): both, as before.
 * Producers (Queue.add, events) work in every role; only consumers move.
 */
export type ProcessRole = 'api' | 'worker' | 'all';

export function processRole(env: NodeJS.ProcessEnv = process.env): ProcessRole {
  const v = String(env.PROCESS_ROLE || '').trim().toLowerCase();
  return v === 'api' || v === 'worker' ? v : 'all';
}

/** True when this process runs cron jobs, queue consumers and background sync. */
export function runsBackgroundWork(env: NodeJS.ProcessEnv = process.env): boolean {
  return processRole(env) !== 'api';
}

/** The scheduler, only where background work runs: without it `@Cron`/`@Interval` are inert metadata. */
export function backgroundImports(env: NodeJS.ProcessEnv = process.env): DynamicModule[] {
  return runsBackgroundWork(env) ? [ScheduleModule.forRoot()] : [];
}

/** Queue consumers (`@Processor` classes), only where background work runs. */
export function backgroundProviders(providers: Provider[], env: NodeJS.ProcessEnv = process.env): Provider[] {
  return runsBackgroundWork(env) ? providers : [];
}
