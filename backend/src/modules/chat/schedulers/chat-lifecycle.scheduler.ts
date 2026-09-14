import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatSession, ChatSessionDocument } from '../../../schemas/chat-session.schema';
import { isDbOutageError } from '../../../common/db-outage';

@Injectable()
export class ChatLifecycleScheduler {
  private readonly logger = new Logger(ChatLifecycleScheduler.name);
  constructor(@InjectModel(ChatSession.name) private chatSessionModel: Model<ChatSessionDocument>) {}

  // Automated execution running every hour to monitor clinical constraints
  @Cron(CronExpression.EVERY_HOUR)
  async enforceFollowUpExpirations() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
    // Hard-locking all sessions that spent exactly 24 hours in post-consultation follow_up phase
    await this.chatSessionModel.updateMany(
      {
        type: 'CLINICAL',
        status: 'FOLLOW_UP',
        updatedAt: { $lte: twentyFourHoursAgo }
      },
      {
        $set: { status: 'CLOSED' }
      }
    );
    } catch (err: any) {
      if (isDbOutageError(err)) {
        this.logger.warn('follow-up expiry skipped (db unavailable)');
        return;
      }
      throw err;
    }
  }
}
