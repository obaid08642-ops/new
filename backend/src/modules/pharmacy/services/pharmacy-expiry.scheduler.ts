import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PharmacyExpiryCommandService } from './pharmacy-expiry-command.service';

/**
 * Master-spec activation: broadcast rounds advance every 60s and offers expire —
 * this sweep drives the durable, lease-claimed expiry command so rounds/offers
 * progress without manual admin calls. The command itself is idempotent and
 * lease-guarded, so overlapping ticks and multi-replica runs are safe.
 */
@Injectable()
export class PharmacyExpiryScheduler {
  private readonly logger = new Logger(PharmacyExpiryScheduler.name);

  constructor(private readonly expiry: PharmacyExpiryCommandService) {}

  @Interval(15_000)
  async sweep() {
    try {
      await this.expiry.expireDuePharmacyOffers(new Date());
    } catch (error: any) {
      this.logger.warn(`pharmacy expiry sweep failed: ${error?.message || error}`);
    }
  }
}
