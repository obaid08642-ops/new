import { Controller, HttpCode, HttpStatus, Injectable, Logger, Post, UseGuards } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { ProductRankingService } from './product-ranking.service';

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
  constructor(private readonly ranking: ProductRankingService) {}

  /** Runs the score job now (the same work as the timer). */
  @Post('recompute')
  @RequirePermissions(Permission.CMS_EDIT)
  @HttpCode(HttpStatus.OK)
  recompute() {
    return this.ranking.recomputeAll();
  }
}
