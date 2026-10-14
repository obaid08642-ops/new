import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';

/** A Redis URL with its password replaced, for logs. */
export function redactRedisUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    if (u.username && u.username !== 'default') u.username = '***';
    return u.toString();
  } catch {
    return 'redis://(unparsable)';
  }
}

/**
 * Applies the centrally configured browser-origin policy to Socket.IO as well as HTTP.
 *
 * P14.13: with Redis configured, every Socket.IO server uses the Redis adapter, so an emit on one process (a cluster
 * worker or another node behind the load balancer) reaches a socket connected to any other. It is attached whenever
 * Redis is configured, whatever the process count, on its own two connections (pub/sub must not share the client the
 * rest of the app uses for commands).
 */
export class ConfiguredIoAdapter extends IoAdapter {
  private readonly log = new Logger('Realtime');
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private clients: Redis[] = [];

  constructor(app: INestApplicationContext, private readonly allowedOrigins: true | string[]) {
    super(app);
  }

  /** Connects the pub/sub pair; resolves false (and the server stays single-process) when Redis cannot be reached. */
  async connectToRedis(url: string | undefined): Promise<boolean> {
    if (!url) return false;
    const pub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });
    const sub = pub.duplicate();
    try {
      await Promise.all([pub.connect(), sub.connect()]);
    } catch (e) {
      this.log.warn(`Socket.IO Redis adapter not attached (${redactRedisUrl(url)}): ${(e as Error).message}`);
      pub.disconnect();
      sub.disconnect();
      return false;
    }
    this.clients = [pub, sub];
    this.adapterConstructor = createAdapter(pub, sub);
    this.log.log(`Socket.IO Redis adapter attached (${redactRedisUrl(url)})`);
    return true;
  }

  createIOServer(port: number, options?: ServerOptions) {
    const cors = this.allowedOrigins === true
      ? { origin: true, credentials: true }
      : { origin: this.allowedOrigins, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] };
    // socket.io's Server constructor accepts Partial<ServerOptions> and applies
    // its own defaults for omitted fields, but the adapter base class declares
    // the parameter as the full ServerOptions interface. Forward exactly what
    // we received plus the CORS policy and bridge the over-strict parameter
    // type with an explicit assertion instead of duplicating socket.io defaults.
    const merged: Partial<ServerOptions> = { ...(options || {}), cors };
    const server = super.createIOServer(port, merged as ServerOptions);
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }

  async close(server: any) {
    await super.close(server);
    for (const c of this.clients) c.disconnect();
    this.clients = [];
  }
}
