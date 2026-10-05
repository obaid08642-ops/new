import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class GuestLifecycleService {
  private readonly logger = new Logger(GuestLifecycleService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupInactiveGuests(): Promise<void> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const result = await this.connection.collection('users').deleteMany({
      is_guest: true,
      last_active: { $lt: twelveMonthsAgo },
      $or: [
        { orders_count: { $exists: false } },
        { orders_count: 0 },
      ],
    });

    this.logger.log(`Cleaned up ${result.deletedCount} inactive guest accounts`);
  }

  async getGuestData(guestUserId: string): Promise<any> {
    const user = await this.connection.collection('users').findOne({ id: guestUserId });
    if (!user) return null;

    const data: any = { user };
    const collections = ['carts', 'addresses', 'search_queries', 'product_views'];
    for (const col of collections) {
      try {
        data[col] = await this.connection.collection(col).find({ user_id: guestUserId }).toArray();
      } catch { /* ignore */ }
    }
    return data;
  }

  async deleteGuestData(guestUserId: string): Promise<void> {
    const collections = [
      'carts', 'addresses', 'search_queries', 'product_views',
      'push_tokens', 'notifications', 'sessions',
    ];
    for (const col of collections) {
      try {
        await this.connection.collection(col).deleteMany({ user_id: guestUserId });
      } catch { /* ignore */ }
    }
    await this.connection.collection('users').deleteOne({ id: guestUserId });
  }
}
