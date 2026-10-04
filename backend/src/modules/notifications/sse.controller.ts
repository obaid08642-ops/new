import { Controller, Sse, UseGuards, MessageEvent, OnModuleInit, Optional } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { RedisService } from '../redis/redis.service';

// 14.13 — cross-worker SSE fan-out via Redis pub/sub. The local `subjects` Map
// stays the subscriber registry (local delivery is synchronous and unchanged);
// `emit` additionally publishes the frame so workers holding the subscriber's
// connection can deliver it. All Redis ops are best-effort: when Redis is down
// (or absent) the controller silently keeps local-only behavior.
const SSE_FANOUT_CHANNEL = 'notifications:sse:fanout';

@Controller('notifications')
export class NotificationSseController implements OnModuleInit {
  private readonly subjects = new Map<string, Subject<any>>();
  private fanoutSubscribed = false;

  constructor(@Optional() private readonly redis?: RedisService) {}

  async onModuleInit() {
    if (!this.redis || this.fanoutSubscribed) return;
    try {
      await this.redis.subscribe(SSE_FANOUT_CHANNEL, (raw) => this.deliverRemote(raw));
      this.fanoutSubscribed = true;
    } catch { /* local-only fallback when Redis is down */ }
  }

  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  stream(@CurrentUser() user: any): Observable<MessageEvent> {
    const subject = this.getOrCreateSubject(user.id);
    return subject.asObservable().pipe(
      map(event => ({
        type: event.type,
        data: JSON.stringify(event.data),
        id: event.id,
        retry: 3000,
      })),
    );
  }

  emit(userId: string, event: { type: string; data: any; id?: string }) {
    this.subjects.get(userId)?.next(event);
    if (this.redis) {
      // Fan-out to sibling workers; Redis down → local-only delivery above stands.
      void this.redis
        .publish(SSE_FANOUT_CHANNEL, JSON.stringify({ userId, event }))
        .catch(() => undefined);
    }
  }

  // Remote frame from a sibling worker → deliver to local subscribers only.
  private deliverRemote(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.userId || !parsed.event) return;
      this.subjects.get(parsed.userId)?.next(parsed.event);
    } catch { /* ignore malformed fan-out frames */ }
  }

  private getOrCreateSubject(userId: string): Subject<any> {
    if (!this.subjects.has(userId)) {
      this.subjects.set(userId, new Subject());
    }
    return this.subjects.get(userId)!;
  }
}
