import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatSession, ChatSessionDocument } from '../../../schemas/chat-session.schema';

@Injectable()
export class ChatLifecycleScheduler {
  constructor(@InjectModel(ChatSession.name) private chatSessionModel: Model<ChatSessionDocument>) {}

  // Automated execution running every hour to monitor clinical constraints
  @Cron(CronExpression.EVERY_HOUR)
  async enforceFollowUpExpirations() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

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
  }
}
