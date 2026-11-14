import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type { Job } from 'bullmq';
import { DURABLE_QUEUE, DurableEventsService } from './durable-events.service';
import { PaymentEventsReconciler } from './payment-events.reconciler';

/** BullMQ consumer: one job per event key. The claim in process() makes a duplicate job a no-op. Registered in the worker role only (backgroundProviders). */
@Processor(DURABLE_QUEUE, { concurrency: 5 })
export class DurableEventsProcessor extends WorkerHost {
  constructor(private readonly svc: DurableEventsService) { super(); }
  async process(job: Job<{ key: string }>) {
    if (job.name !== 'deliver') return;
    return this.svc.process(job.data.key);
  }
}

/** Safety net, worker role only: re-queue due rows (crash, Redis outage, backoff elapsed) and announce payments that were saved but never enqueued. */
@Injectable()
export class DurableEventsSweeper {
  private readonly logger = new Logger('DurableEventsSweeper');
  private running = false;
  constructor(private readonly svc: DurableEventsService, private readonly payments: PaymentEventsReconciler) {}

  @Interval(10_000)
  async sweep() {
    if (this.running) return;       // one sweep at a time per process; across workers the claim in process() is the lock
    this.running = true;
    try {
      await this.payments.reconcile().catch((e) => this.logger.warn(`payment_reconcile_failed err=${e?.message}`));
      const n = await this.svc.drain();
      if (n) this.logger.log(`drained ${n}`);
    } finally { this.running = false; }
  }
}
