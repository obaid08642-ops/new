/**
 * Phase 21.8 — guest data lifecycle on a schedule.
 *
 * Account deletion (Phase 10) already covers the data of a real account; this
 * job covers the other half: guests nobody ever converted. It runs daily and is
 * a thin, testable wrapper around `GuestService.purgeInactiveGuests`, so the
 * behaviour can be proven with a short window instead of waiting 12 months.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GuestService } from './guest.service';

@Injectable()
export class GuestLifecycleService {
  private readonly logger = new Logger(GuestLifecycleService.name);

  constructor(private readonly guests: GuestService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purgeInactiveGuests(opts: { retentionDays?: number } = {}): Promise<{ anonymised: number; deleted: number }> {
    const result = await this.guests.purgeInactiveGuests(new Date(), opts);
    if (result.anonymised || result.deleted) {
      this.logger.log(`guest lifecycle: ${result.anonymised} anonymised, ${result.deleted} deleted`);
    }
    return result;
  }
}
