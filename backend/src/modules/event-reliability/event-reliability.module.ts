/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║   EVENT RELIABILITY SYSTEM                                     ║
 * ║   Delivery confirmation + dead-letter + retry/replay endpoints ║
 * ╚════════════════════════════════════════════════════════════════╝
 */
import { Module, Controller, Get, Post, Param, Query, UseGuards, Injectable } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { SystemEvent, SystemEventSchema } from '../events/system-event.schema';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable as Inj } from '@nestjs/common';

@Schema({ collection: 'event_dlq', timestamps: true })
export class EventDlq extends Document {
  @Prop({ required: true, index: true }) original_event_id: string;
  @Prop({ required: true, index: true }) type: string;
  @Prop() entity_type: string;
  @Prop({ index: true }) entity_id: string;
  @Prop({ type: Object }) payload: any;
  @Prop({ default: 0 }) attempts: number;
  @Prop() last_error: string;
  @Prop({ default: 'pending', enum: ['pending', 'retried', 'replayed', 'dead'], index: true }) status: string;
}
export const EventDlqSchema = SchemaFactory.createForClass(EventDlq);

@Schema({ collection: 'event_delivery_log', timestamps: true })
export class EventDelivery extends Document {
  @Prop({ required: true, index: true }) event_id: string;
  @Prop({ required: true }) type: string;
  @Prop({ index: true }) listener: string;
  @Prop({ default: 'delivered', enum: ['delivered', 'failed'] }) status: string;
  @Prop() error: string;
}
export const EventDeliverySchema = SchemaFactory.createForClass(EventDelivery);

@Inj()
export class EventReliabilityService {
  constructor(
    @InjectModel('SystemEvent') private events: Model<any>,
    @InjectModel('EventDlq') private dlq: Model<EventDlq>,
    @InjectModel('EventDelivery') private delivery: Model<EventDelivery>,
    private bus: EventEmitter2,
  ) {}

  /** All service.* events log delivery confirmation. */
  @OnEvent('service.*')
  async onAnyServiceEvent(payload: any, ...args: any[]) {
    try {
      await this.delivery.create({
        event_id: payload?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: payload?.type || 'service.unknown',
        listener: 'reliability_logger',
        status: 'delivered',
      });
    } catch { /* swallow */ }
  }

  /** Send-to-dead-letter helper for downstream listeners that fail. */
  async pushToDlq(event: any, error: string) {
    return this.dlq.create({
      original_event_id: event?.id || '',
      type: event?.type || 'unknown',
      entity_type: event?.entity_type,
      entity_id: event?.entity_id,
      payload: event,
      attempts: 0,
      last_error: error,
      status: 'pending',
    });
  }

  /** Status overview. */
  async status() {
    const since24 = new Date(Date.now() - 86400000);
    const [delivered24, failed24, dlqPending, dlqDead, totalEvents] = await Promise.all([
      this.delivery.countDocuments({ status: 'delivered', createdAt: { $gte: since24 } }),
      this.delivery.countDocuments({ status: 'failed', createdAt: { $gte: since24 } }),
      this.dlq.countDocuments({ status: 'pending' }),
      this.dlq.countDocuments({ status: 'dead' }),
      this.events.estimatedDocumentCount(),
    ]);
    const recentDlq = await this.dlq.find({ status: 'pending' }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(20).lean();
    return {
      window: '24h',
      delivered: delivered24,
      failed: failed24,
      dlq_pending: dlqPending,
      dlq_dead: dlqDead,
      events_total: totalEvents,
      recent_dlq: recentDlq,
      generated_at: new Date(),
    };
  }

  /** Re-emit all pending DLQ events. */
  async retryFailed() {
    const pending = await this.dlq.find({ status: 'pending' }).limit(200);
    let retried = 0, deadlined = 0;
    for (const d of pending) {
      try {
        await this.bus.emitAsync(d.type, d.payload);
        d.attempts = (d.attempts || 0) + 1;
        d.status = 'retried';
        await d.save();
        retried++;
      } catch (e: any) {
        d.attempts = (d.attempts || 0) + 1;
        d.last_error = String(e?.message || e);
        if (d.attempts >= 5) { d.status = 'dead'; deadlined++; }
        await d.save();
      }
    }
    return { retried, deadlined, remaining_pending: await this.dlq.countDocuments({ status: 'pending' }) };
  }

  /** Replay a single event by its system-event id. */
  async replayOne(eventId: string) {
    const evt: any = await this.events.findOne({ id: eventId }, { _id: 0, __v: 0 }).lean();
    if (!evt) return { ok: false, error: 'event_not_found' };
    try {
      await this.bus.emitAsync(evt.type, evt);
      return { ok: true, replayed: evt.type };
    } catch (e: any) { return { ok: false, error: String(e?.message || e) }; }
  }
}

@Controller('events')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class EventReliabilityController {
  constructor(private svc: EventReliabilityService) {}
  @Get('status') status() { return this.svc.status(); }
  @Post('retry-failed') retry() { return this.svc.retryFailed(); }
  @Post('replay/:eventId') replay(@Param('eventId') id: string) { return this.svc.replayOne(id); }
}

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'SystemEvent', schema: SystemEventSchema },
    { name: 'EventDlq', schema: EventDlqSchema },
    { name: 'EventDelivery', schema: EventDeliverySchema },
  ])],
  controllers: [EventReliabilityController],
  providers: [EventReliabilityService],
  exports: [EventReliabilityService],
})
export class EventReliabilityModule {}
