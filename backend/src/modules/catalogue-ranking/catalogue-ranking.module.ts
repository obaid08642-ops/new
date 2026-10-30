import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CatalogueRankingController } from './catalogue-ranking.controller';
import { CatalogueRankingService } from './catalogue-ranking.service';

/** The score job for labs, radiology and nursing, on a timer: decay reaches services with no new signal. */
@Injectable()
export class CatalogueRankingJob {
  private readonly logger = new Logger('CatalogueRankingJob');
  constructor(private readonly ranking: CatalogueRankingService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async run(): Promise<void> {
    try {
      const counts = await this.ranking.recompute(true);
      this.logger.log(`catalogue ranking: ${counts.map((c) => `${c.vertical} ${c.changed}/${c.rows}`).join(', ')}`);
    } catch (err) {
      this.logger.error(`catalogue ranking recompute failed: ${(err as Error).message}`);
    }
  }
}

@Global()
@Module({
  controllers: [CatalogueRankingController],
  providers: [CatalogueRankingService, CatalogueRankingJob],
  exports: [CatalogueRankingService],
})
export class CatalogueRankingModule {}
