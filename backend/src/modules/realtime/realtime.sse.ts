import { Module, Controller, Sse, MessageEvent, UseGuards, Param } from '@nestjs/common';
import { Observable, fromEvent, map, merge, filter, interval, mapTo, startWith } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtAuthGuard, CurrentUser, Public } from '../../common/auth.guard';

/**
 * SSE bridge — realtime stream as a fallback to WebSocket gateway.
 * Mounted at /api/realtime/stream and /api/realtime/booking/:type/:id
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

  // Booking-scoped public stream (anonymous-ok for SEO tracking pages)
  @Sse('booking/:type/:id')
  @Public()
  bookingStream(@Param('type') type: string, @Param('id') id: string): Observable<MessageEvent> {
    const heartbeat = interval(25_000).pipe(mapTo({ data: { type: 'heartbeat', t: Date.now() } } as MessageEvent));
    const events: Observable<MessageEvent> = fromEvent(this.em as any, 'realtime.booking').pipe(
      filter((e: any) => e?.kind === type && e?.id === id),
      map((e: any) => ({ data: e.payload, type: e.event } as MessageEvent)),
    );
    return merge(events, heartbeat).pipe(startWith({ data: { type: 'connected', t: Date.now() } } as MessageEvent));
  }
}

@Module({ controllers: [RealtimeSseController] })
export class RealtimeSseModule {}
