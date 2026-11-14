import type { RedisService } from '../redis/redis.service';

/**
 * R4: the doctor's waiting-room queue was a per-process Map, so with two API nodes each node saw only the patients whose socket it held
 * (wrong positions, "ready" sent to the wrong patient). It is now one sorted set per doctor in Redis (score = time of joining, so order is
 * stable and a re-join keeps the original place). Without a RedisService (hand-built tests) it keeps the old in-process behaviour.
 */
export class WaitingRoomQueue {
  private readonly local = new Map<string, string[]>();
  constructor(private readonly redis?: Pick<RedisService, 'zadd' | 'zrem' | 'zrange' | 'zscore' | 'expire'>, private readonly now: () => number = Date.now) {}

  private key(doctorId: string) { return `waitroom:queue:${doctorId}`; }

  /** Adds the appointment unless it is already queued. */
  async add(doctorId: string, appointmentId: string): Promise<void> {
    if (!this.redis) {
      const q = this.local.get(doctorId) ?? [];
      if (!q.includes(appointmentId)) q.push(appointmentId);
      this.local.set(doctorId, q);
      return;
    }
    if ((await this.redis.zscore(this.key(doctorId), appointmentId)) === null) await this.redis.zadd(this.key(doctorId), this.now(), appointmentId);
    await this.redis.expire(this.key(doctorId), 24 * 3600);   // a queue nobody leaves cleanly does not live forever
  }

  /** True when the appointment was in the queue. */
  async remove(doctorId: string, appointmentId: string): Promise<boolean> {
    if (!this.redis) {
      const q = this.local.get(doctorId);
      const i = q ? q.indexOf(appointmentId) : -1;
      if (i === -1) return false;
      q!.splice(i, 1);
      return true;
    }
    const was = (await this.redis.zscore(this.key(doctorId), appointmentId)) !== null;
    if (was) await this.redis.zrem(this.key(doctorId), appointmentId);
    return was;
  }

  async list(doctorId: string): Promise<string[]> {
    if (!this.redis) return [...(this.local.get(doctorId) ?? [])];
    return this.redis.zrange(this.key(doctorId), 0, -1);
  }
}
