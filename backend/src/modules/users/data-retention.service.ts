import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Saudi PDPL requirement: Personal data must be destroyed when no longer needed.
   * We hard-delete soft-deleted users and their associated PII after 30 days.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async enforceDataRetention() {
    this.logger.log('Starting PDPL Data Retention cleanup...');
    
    // Retention period is configurable, defaulting to 30 days
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '30', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await this.userModel.deleteMany({
        deleted_at: { $lte: cutoffDate },
      });

      if (result.deletedCount > 0) {
        this.logger.log(`Hard-deleted ${result.deletedCount} users exceeding retention policy (${retentionDays} days).`);
      } else {
        this.logger.log('No stale data found for hard-deletion.');
      }
    } catch (error: any) {
      this.logger.error('Data retention cleanup failed', error.stack);
    }
  }
}
