import { Controller, HttpCode, HttpStatus, Injectable, Logger, Optional, Post, UseGuards } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { ProductRankingService } from './product-ranking.service';
import { CatalogueRankingService } from '../catalogue-ranking/catalogue-ranking.service';

/** The score job on a timer: decay reaches products that have had no event since. */
@Injectable()
export class RankingScoreJob {
  private readonly logger = new Logger('RankingScoreJob');
  constructor(private readonly ranking: ProductRankingService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async run(): Promise<void> {
    try {
      const { updated } = await this.ranking.recomputeAll();
      this.logger.log(`ranking recomputed for ${updated} products`);
    } catch (err) {
      this.logger.error(`ranking recompute failed: ${(err as Error).message}`);
    }
  }
}

@Controller('admin/ranking')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class RankingAdminController {
  constructor(private readonly ranking: ProductRankingService, @Optional() private readonly catalogues?: CatalogueRankingService) {}

  /** Runs the score job now (the same work as the timer): the pharmacy products, and the lab, radiology and nursing catalogues. */
  @Post('recompute')
  @RequirePermissions(Permission.CMS_EDIT)
  @HttpCode(HttpStatus.OK)
  async recompute() {
    const products = await this.ranking.recomputeAll();
    return this.catalogues ? { ...products, catalogues: await this.catalogues.recompute(true) } : products;
  }
}
