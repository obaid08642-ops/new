import { Module, Controller, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { Observable, fromEvent, map, merge, filter, interval, mapTo, startWith } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';

/**
 * SSE bridge — realtime stream as a fallback to WebSocket gateway.
 * Mounted at /api/realtime/stream (authenticated, filtered to the caller).
 * Heartbeats every 25s to prevent ingress idle-close.
 */
@Controller('realtime')
export class RealtimeSseController {
  constructor(private readonly em: EventEmitter2) {}

  // Generic user stream (filtered by patient_id)
  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  stream(@CurrentUser() user: any): Observable<MessageEvent> {
    const heartbeat = interval(25_000).pipe(mapTo({ data: { type: 'heartbeat', t: Date.now() } } as MessageEvent));
    const events: Observable<MessageEvent> = fromEvent(this.em as any, 'realtime.user').pipe(
      filter((e: any) => e?.user_id === user.id),
      map((e: any) => ({ data: e.payload, type: e.event } as MessageEvent)),
    );
    return merge(events, heartbeat).pipe(startWith({ data: { type: 'connected', t: Date.now() } } as MessageEvent));
  }
}

@Module({ controllers: [RealtimeSseController] })
export class RealtimeSseModule {}
