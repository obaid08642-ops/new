import { Injectable } from '@nestjs/common';

@Injectable()
export class SingleFlightService {
  private readonly inflight = new Map<string, Promise<any>>();

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.inflight.has(key)) {
      return this.inflight.get(key) as Promise<T>;
    }
    const promise = fn().finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return promise;
  }

  isInflight(key: string): boolean {
    return this.inflight.has(key);
  }

  inflightCount(): number {
    return this.inflight.size;
  }
}
