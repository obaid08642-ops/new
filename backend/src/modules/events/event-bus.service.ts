import { Injectable, Logger, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { SystemEvent } from './system-event.schema';
import { SystemEventRepository } from "./repositories/systemevent.repository";

export interface EmitInput {
  type: string;
  entity_type: 'order' | 'allocation' | 'broadcast' | 'chat' | 'shortage' | string;
  entity_id: string;
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
 * EventBusService — fire-and-forget persisted event log.
 * Phase 2 hardening: callers should NEVER await this (use .catch silently).
 * All emit failures are swallowed and logged so domain logic never breaks.
 */
@Injectable()
export class EventBusService {
  private logger = new Logger('EventBus');
  constructor(@Inject('SystemEventRepository') private events: SystemEventRepository) {}

  async emit(input: EmitInput): Promise<void> {
    try {
      await this.events.create({
        type: input.type,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
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
      this.logger.warn(`emit_failed type=${input.type} err=${e?.message}`);
    }
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
