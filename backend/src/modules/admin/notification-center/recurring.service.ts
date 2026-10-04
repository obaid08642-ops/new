import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../../common/enums';

/**
 * N8: Automatic recurring notifications, defined by the admin.
 *
 * Each rule has: audience, frequency (daily/weekly/monthly), local send time,
 * start/end dates, text/image per locale, deep link, enable/disable.
 *
 * The server runs each rule on schedule (timezone Asia/Riyadh), sends it only
 * once per period, and logs every run.
 */
@Injectable()
export class RecurringNotificationService {
  private readonly logger = new Logger('RecurringNotifications');

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly notifications: NotificationsService,
  ) {}

  private get rules() {
    return this.conn.collection('notification_recurring_rules');
  }

  private get runs() {
    return this.conn.collection('notification_recurring_runs');
  }

  /** Create or update a recurring rule. */
  async upsertRule(adminId: string, rule: {
    id?: string;
    name: string;
    audience: { type: string; filters: any };
    frequency: 'daily' | 'weekly' | 'monthly';
    sendTime: string; // HH:MM in Asia/Riyadh
    startDate: string;
    endDate?: string;
    title: Record<string, string>;
    body: Record<string, string>;
    image?: string;
    deepLink?: string;
    enabled: boolean;
  }) {
    // A new rule gets an id: toggleRule and later upserts match on it (it was inserted without one).
    const id = rule.id ? String(rule.id) : randomUUID();
    const doc = {
      ...rule,
      id,
      updated_by: adminId,
      updated_at: new Date(),
    };
    if (rule.id) {
      await this.rules.updateOne({ id: { $eq: id } }, { $set: doc }, { upsert: true });
    } else {
      (doc as any).created_by = adminId;
      (doc as any).created_at = new Date();
      await this.rules.insertOne(doc);
    }
    return { ok: true, id };
  }

  /** List all rules. */
  async listRules(): Promise<any[]> {
    return this.rules.find({}).sort({ created_at: -1 }).toArray();
  }

  /** Toggle a rule on/off. */
  async toggleRule(id: string, enabled: boolean) {
    const res = await this.rules.updateOne({ id }, { $set: { enabled, updated_at: new Date() } });
    if ((res as any).modifiedCount === 0 && !(await this.rules.findOne({ id }))) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('recurring_rule_not_found');
    }
    return { ok: true };
  }

  /**
   * Cron: run all enabled rules that are due.
   * Runs every 15 minutes in Asia/Riyadh timezone.
   */
  @Cron('*/15 * * * *')
  async runDueRules() {
    const now = new Date();
    const riyadhTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    const currentTime = `${String(riyadhTime.getHours()).padStart(2, '0')}:${String(riyadhTime.getMinutes()).padStart(2, '0')}`;
    const currentDay = riyadhTime.getDay(); // 0=Sunday

    const rules = await this.rules.find({ enabled: true }).toArray();
    for (const rule of rules) {
      try {
        // Check if rule is due
        if (!this.isRuleDue(rule, currentTime, currentDay, riyadhTime)) continue;

        // Check if already sent in this period
        const periodKey = this.getPeriodKey(rule, riyadhTime);
        const alreadySent = await this.runs.findOne({ rule_id: rule.id, period: periodKey });
        if (alreadySent) continue;

        // Resolve audience
        const audience = await this.resolveAudience(rule.audience);
        if (audience.length === 0) {
          this.logger.warn(`Rule ${rule.id}: empty audience, skipping`);
          continue;
        }

        // Send to each user in the audience
        for (const userId of audience) {
          await this.notifications.create({
            user_id: userId,
            title_key: rule.title.ar || rule.title.en,
            body_key: rule.body.ar || rule.body.en,
            type: NotificationType.INFO,
            action: rule.deepLink ? { route: rule.deepLink } : undefined,
          });
        }

        // Log the run
        await this.runs.insertOne({
          rule_id: rule.id,
          period: periodKey,
          sent_count: audience.length,
          sent_at: new Date(),
        });

        this.logger.log(`Rule ${rule.id}: sent to ${audience.length} users`);
      } catch (e: any) {
        this.logger.error(`Rule ${rule.id} failed: ${e.message}`);
      }
    }
  }

  private isRuleDue(rule: any, currentTime: string, currentDay: number, now: Date): boolean {
    // Check time
    if (currentTime !== rule.sendTime) return false;

    // Check date range
    const start = new Date(rule.startDate);
    if (now < start) return false;
    if (rule.endDate) {
      const end = new Date(rule.endDate);
      if (now > end) return false;
    }

    // Check frequency
    if (rule.frequency === 'daily') return true;
    if (rule.frequency === 'weekly') {
      // Send on the same day of week as startDate
      return currentDay === start.getDay();
    }
    if (rule.frequency === 'monthly') {
      // Send on the same day of month as startDate
      return now.getDate() === start.getDate();
    }
    return false;
  }

  private getPeriodKey(rule: any, now: Date): string {
    if (rule.frequency === 'daily') return now.toISOString().slice(0, 10);
    if (rule.frequency === 'weekly') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return weekStart.toISOString().slice(0, 10);
    }
    if (rule.frequency === 'monthly') return now.toISOString().slice(0, 7);
    return now.toISOString();
  }

  private async resolveAudience(audience: { type: string; filters: any }): Promise<string[]> {
    // Simplified audience resolution — in production this would query the real collections
    // based on the filters (user type, age, city, language, order history, etc.)
    const users = await this.conn.collection('users').find({
      role: 'patient',
      ...(audience.filters?.city ? { city: audience.filters.city } : {}),
      ...(audience.filters?.lang ? { lang: audience.filters.lang } : {}),
    }).limit(1000).toArray();
    return users.map((u: any) => u.id);
  }
}
