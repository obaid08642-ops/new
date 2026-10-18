import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

/**
 * 20.9 zero-downtime deploys. On SIGTERM (Nest closes the app) this process keeps serving for SHUTDOWN_DRAIN_MS while
 * every answer carries `Connection: close`, so nginx stops reusing its keepalive connections to it. When the listener
 * finally closes, no idle connection is left for nginx to pick at that instant (a request sent on a connection that is
 * being closed fails with 502 and is not retried when it is a POST). SHUTDOWN_DRAIN_MS=0 (default) disables it.
 * The rolling deploy (deploy/scripts/rolling-deploy.sh) sets it in the compose file and waits for it with docker stop -t.
 */
@Injectable()
export class GracefulDrain implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GracefulDrain.name);
  private draining = false;

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  get isDraining(): boolean {
    return this.draining;
  }

  onModuleInit(): void {
    const server: any = this.adapterHost?.httpAdapter?.getInstance?.();
    if (!server) return;
    if (typeof server.addHook === 'function') {
      // Fastify
      server.addHook('onSend', async (_req: unknown, reply: any) => {
        if (this.draining) reply.header('connection', 'close');
      });
    } else if (typeof server.use === 'function') {
      // Express
      server.use((_req: unknown, res: any, next: () => void) => {
        if (this.draining) res.setHeader('Connection', 'close');
        next();
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    const ms = Number(process.env.SHUTDOWN_DRAIN_MS || 0);
    if (!(ms > 0)) return;
    this.draining = true;
    this.logger.log(`draining for ${ms} ms (Connection: close on every answer), then closing`);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
