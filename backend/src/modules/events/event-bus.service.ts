import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SystemEvent } from './system-event.schema';
import { SystemEventRepository } from "./repositories/systemevent.repository";

export interface EmitInput {
  type: string;
  entity_type: 'order' | 'allocation' | 'broadcast' | 'chat' | 'shortage' | string;
  entity_id: string;
  /** Stable command key. A duplicate means the prior durable event already won. */
  idempotency_key?: string;
  actor_account_id?: string;
  actor_role?: string;
  reason_code?: string;
  patient_account_id?: string;
  pharmacy_account_id?: string;
  before?: any;
  after?: any;
  meta?: any;
}

/**
 * EventBusService — durable event log before in-process fanout.
 * A failure to persist an event must prevent local fanout; otherwise users can
 * observe a notification/state effect with no durable audit/outbox evidence.
 */
@Injectable()
export class EventBusService {
  private logger = new Logger('EventBus');
  constructor(
    @Inject('SystemEventRepository') private events: SystemEventRepository,
    @Optional() private readonly emitter?: EventEmitter2,
  ) {}

  async emit(input: EmitInput): Promise<{ duplicate: boolean }> {
    try {
      await this.events.create({
        type: input.type,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        idempotency_key: input.idempotency_key,
        actor_account_id: input.actor_account_id,
        actor_role: input.actor_role || 'system',
        reason_code: input.reason_code,
        patient_account_id: input.patient_account_id,
        pharmacy_account_id: input.pharmacy_account_id,
        before: input.before,
        after: input.after,
        meta: input.meta,
      });
    } catch (e: any) {
      // Mongo's unique sparse index makes retries safe even under concurrent
      // delivery. Do not fan out twice after an already-durable command.
      if (input.idempotency_key && e?.code === 11000) {
        this.logger.log(`emit_duplicate type=${input.type} key=${input.idempotency_key}`);
        return { duplicate: true };
      }
      this.logger.warn(`emit_failed type=${input.type} err=${e?.message}`);
      throw e;
    }
    // Fan out to the in-process event system so @OnEvent handlers
    // (notifications, analytics, gateways) actually fire for bus events.
    try {
      this.emitter?.emit(input.type, input);
    } catch (e: any) {
      this.logger.warn(`emitter_fanout_failed type=${input.type} err=${e?.message}`);
    }
    return { duplicate: false };
  }

  /** Admin: paginated event stream with filters. */
  async list(filter: { type?: string; entity_type?: string; entity_id?: string; pharmacy_account_id?: string; patient_account_id?: string; since?: Date; limit?: number }) {
    const q: any = {};
    if (filter.type) q.type = filter.type;
    if (filter.entity_type) q.entity_type = filter.entity_type;
    if (filter.entity_id) q.entity_id = filter.entity_id;
    if (filter.pharmacy_account_id) q.pharmacy_account_id = filter.pharmacy_account_id;
    if (filter.patient_account_id) q.patient_account_id = filter.patient_account_id;
    if (filter.since) q.createdAt = { $gte: filter.since };
    const limit = Math.min(filter.limit || 200, 1000);
    return this.events.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(limit).lean();
  }
}
