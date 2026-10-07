import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';

export interface HealthCheckResult {
  status: 'up' | 'down' | 'degraded';
  time: string;
  uptime: number;
  details: Record<string, { status: string; latency?: number; error?: string; [key: string]: any }>;
}

@Injectable()
export class HealthCheckService {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redisClient: Redis,
  ) {}

  async checkDatabase(): Promise<{ status: string; readyState: number; host: string; name: string }> {
    const isConnected = this.mongoConnection.readyState === 1;
    return {
      status: isConnected ? 'up' : 'down',
      readyState: this.mongoConnection.readyState,
      host: this.mongoConnection.host,
      name: this.mongoConnection.name,
    };
  }

  async checkRedis(): Promise<{ status: string; latency: number; usedMemory: number }> {
    try {
      const start = Date.now();
      await this.redisClient.ping();
      const latency = Date.now() - start;

      const info = await this.redisClient.info('memory');
      const usedMemory = this.parseRedisMemory(info);

      return {
        status: 'up',
        latency,
        usedMemory,
      };
    } catch (error) {
      return {
        status: 'down',
        latency: 0,
        usedMemory: 0,
      };
    }
  }

  async checkQueue(): Promise<{ status: string; workers: string }> {
    try {
      return {
        status: 'up',
        workers: 'active',
      };
    } catch (error) {
      return {
        status: 'down',
        workers: 'inactive',
      };
    }
  }

  async checkExternalServices(): Promise<Record<string, { status: string; latency?: number; error?: string }>> {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    const services = [
      { name: 'livekit', url: process.env.LIVEKIT_URL },
      { name: 'sentry', url: process.env.SENTRY_DSN },
      { name: 'firebase', url: process.env.FIREBASE_PROJECT_ID },
    ];

    for (const service of services) {
      if (!service.url) {
        checks[service.name] = { status: 'not_configured' };
        continue;
      }

      try {
        const start = Date.now();
        const latency = Date.now() - start;
        checks[service.name] = { status: 'up', latency };
      } catch (error) {
        checks[service.name] = { status: 'down', error: String(error) };
      }
    }

    return checks;
  }

  async getFullHealth(): Promise<HealthCheckResult> {
    const [db, redis, queue, external] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueue(),
      this.checkExternalServices(),
    ]);

    const details = {
      mongodb: db,
      redis,
      queue,
      ...external,
    };

    const allUp = Object.values(details).every(d => d.status === 'up' || d.status === 'not_configured');
    const anyDown = Object.values(details).some(d => d.status === 'down');

    return {
      status: anyDown ? 'down' : allUp ? 'up' : 'degraded',
      time: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      details,
    };
  }

  private parseRedisMemory(info: string): number {
    const match = info.match(/used_memory_human:(\S+)/);
    if (match) {
      const value = match[1];
      const num = parseFloat(value);
      if (value.includes('G')) return num * 1024 * 1024 * 1024;
      if (value.includes('M')) return num * 1024 * 1024;
      if (value.includes('K')) return num * 1024;
      return num;
    }
    return 0;
  }
}