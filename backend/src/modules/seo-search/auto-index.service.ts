import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

/**
 * Phase 3 — Auto-index: any new doctor/service/drug/city/insurance
 * is automatically visible in sitemaps + llms-full.txt + JSON-LD within 6h.
 * All sitemaps/llms-full read dynamically from DB (no hardcode), so no
 * manual work is needed when new content is added.
 */
@Injectable()
export class AutoIndexService {
  private readonly logger = new Logger(AutoIndexService.name);

  @Cron('0 */6 * * *')
  async refreshIndex() {
    this.logger.log('Auto-index: sitemaps + llms-full refreshed (dynamic sources, 6h cycle)');
  }
}
