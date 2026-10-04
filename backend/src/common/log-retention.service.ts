import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Log Retention Policy Configuration
 * - Audit logs: 7 years (regulatory/legal compliance)
 * - Security events: 7 years
 * - Application logs: 90 days
 * - Debug/trace logs: 30 days
 */
export const LOG_RETENTION_DAYS = {
  audit: 2555, // 7 years
  security: 2555, // 7 years
  application: 90,
  debug: 30,
} as const;

export type LogCategory = keyof typeof LOG_RETENTION_DAYS;

@Injectable()
export class LogRetentionService implements OnModuleInit {
  private readonly retentionConfigs: Record<LogCategory, { collection: string; days: number }> = {
    audit: { collection: 'auditlogs', days: LOG_RETENTION_DAYS.audit },
    security: { collection: 'auditlogs', days: LOG_RETENTION_DAYS.security },
    application: { collection: 'applicationlogs', days: LOG_RETENTION_DAYS.application },
    debug: { collection: 'debuglogs', days: LOG_RETENTION_DAYS.debug },
  };

  constructor(@InjectModel('AuditLog') private readonly auditLogModel: Model<any>) {}

  async onModuleInit() {
    // Ensure TTL indexes are created for automatic expiration
    await this.createTtlIndexes();
  }

  private async createTtlIndexes(): Promise<void> {
    try {
      // Create TTL index on auditlogs for automatic cleanup
      // Using createdAt field with 7 years expiry
      await this.auditLogModel.collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: LOG_RETENTION_DAYS.audit * 24 * 60 * 60, name: 'ttl_auditlogs_7y' },
      );
    } catch (error) {
      // Index may already exist, ignore
    }
  }

  /**
   * Manual cleanup for categories without TTL or for immediate enforcement
   * Runs daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runRetentionCleanup(): Promise<void> {
    const now = new Date();
    
    for (const [category, config] of Object.entries(this.retentionConfigs)) {
      const cutoffDate = new Date(now.getTime() - config.days * 24 * 60 * 60 * 1000);
      
      try {
        const result = await this.auditLogModel.deleteMany({
          createdAt: { $lt: cutoffDate },
          // Only delete non-critical severity to preserve important security events
          severity: { $ne: 'critical' },
        });
        
        if (result.deletedCount > 0) {
          console.log(`[LogRetention] Cleaned ${result.deletedCount} ${category} logs older than ${config.days} days`);
        }
      } catch (error) {
        console.error(`[LogRetention] Failed to cleanup ${category} logs:`, error);
      }
    }
  }

  /**
   * Get retention policy info for admin UI
   */
  getRetentionPolicy(): Record<LogCategory, { collection: string; days: number; description: string }> {
    return {
      audit: { 
        collection: 'auditlogs', 
        days: LOG_RETENTION_DAYS.audit, 
        description: 'Audit trail for all mutations (append-only)' 
      },
      security: { 
        collection: 'auditlogs', 
        days: LOG_RETENTION_DAYS.security, 
        description: 'Security events (login failures, admin actions, etc.)' 
      },
      application: { 
        collection: 'applicationlogs', 
        days: LOG_RETENTION_DAYS.application, 
        description: 'General application logs' 
      },
      debug: { 
        collection: 'debuglogs', 
        days: LOG_RETENTION_DAYS.debug, 
        description: 'Debug and trace logs' 
      },
    };
  }
}