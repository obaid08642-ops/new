export type OutboxEventStatus = 'pending' | 'sent' | 'failed';

export interface OutboxRecord {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: OutboxEventStatus;
  attempts: number;
  createdAt: string;
  sentAt?: string;
  lastError?: string;
}

export interface NewOutboxEvent {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

// TRANSACTION PATTERN (deferred wiring — apply at the write call-site, no shared edit here):
// Append the outbox row inside the SAME transaction as the domain write so the
// event can never exist without the write (and vice versa). Mongoose:
//   await session.withTransaction(async () => {
//     await Model.create([doc], { session });
//     await OutboxModel.create([toOutboxRow(event)], { session });
//   });
// Prisma:
//   await prisma.$transaction(async (tx) => {
//     await tx.entity.create({ data });
//     await tx.outboxEvent.create({ data: toOutboxRow(event) });
//   });
// The relay in ./outbox.relay.ts later drains rows with status 'pending' only.

export function buildOutboxRecord(event: NewOutboxEvent, id: string, nowIso: string): OutboxRecord {
  return {
    id,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    eventType: event.eventType,
    payload: event.payload,
    status: 'pending',
    attempts: 0,
    createdAt: nowIso,
  };
}
