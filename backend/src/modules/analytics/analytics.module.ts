import { Module, Controller, Post, Get, Body, Query, UseGuards, Injectable, Req } from '@nestjs/common';
import { InjectModel, InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { Request } from 'express';
import { JwtAuthGuard, Roles, Public, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AnalyticsEvent, AnalyticsEventDocument, AnalyticsEventSchema } from '../../schemas/analytics-event.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel('AnalyticsEvent') private eventModel: Model<AnalyticsEventDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly redis: RedisService,
  ) {}

  async logEvent(
    userId: string | undefined,
    ip: string,
    userAgent: string,
    dto: {
      event_type: string;
      domain: string;
      metadata?: any;
      session_id?: string;
    }
  ): Promise<AnalyticsEvent> {
    return this.eventModel.create({
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      event_type: dto.event_type,
      domain: dto.domain,
      metadata: dto.metadata || {},
      session_id: dto.session_id,
    });
  }

  async popularSearches(domain: string, limit = 10) {
    return this.eventModel.aggregate([
      { $match: { event_type: 'search', domain } },
      { $group: { _id: '$metadata.query', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null, $gt: '' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { query: '$_id', count: 1, _id: 0 } }
    ]);
  }

  async getAdminStats(domain: string, periodDays = 30) {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - periodDays);

    const match: any = { createdAt: { $gte: minDate } };
    if (domain && domain !== 'all') match.domain = domain;

    const stats = await this.eventModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$event_type',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': 1 } }
    ]);

    // Format results into user-friendly timeseries chart structure
    const timeseries: Record<string, Record<string, number>> = {};
    stats.forEach(s => {
      const day = s._id.day;
      const type = s._id.type;
      if (!timeseries[day]) timeseries[day] = {};
      timeseries[day][type] = s.count;
    });

    return {
      period_days: periodDays,
      domain,
      timeseries,
    };
  }

  async getSystemHealth() {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    try {
      if (this.connection.readyState === 1) {
        dbStatus = 'connected';
      }
    } catch {}

    try {
      const client = this.redis.getClient();
      if (client && client.status === 'ready') {
        redisStatus = 'connected';
      }
    } catch {}

    const memoryUsage = process.memoryUsage();
    return {
      status: dbStatus === 'connected' && redisStatus === 'connected' ? 'healthy' : 'degraded',
      time: new Date().toISOString(),
      database: { status: dbStatus },
      redis: { status: redisStatus },
      system: {
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        },
      },
    };
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activeUsersCount = 0;
    let messagesToday = 0;
    let callsToday = 0;
    let activeCallsCount = 0;
    let failedCallsToday = 0;
    let activeConsultationsCount = 0;
    let failedNotificationsToday = 0;
    let successfulNotificationsToday = 0;
    let queueWaiting = 0;
    let queueActive = 0;
    let queueFailed = 0;
    let totalStorageBytes = 0;

    try {
      const keys = await this.redis.keys('presence:*');
      const userKeys = keys.filter(k => !k.includes('devices:'));
      activeUsersCount = userKeys.length;
    } catch {}

    try {
      const messageCol = this.connection.collection('messages');
      messagesToday = await messageCol.countDocuments({ createdAt: { $gte: today } });
    } catch {}

    try {
      const callCol = this.connection.collection('call_sessions');
      callsToday = await callCol.countDocuments({ createdAt: { $gte: today } });
      activeCallsCount = await callCol.countDocuments({ status: 'active' });
      failedCallsToday = await callCol.countDocuments({
        createdAt: { $gte: today },
        status: { $in: ['missed', 'rejected'] },
      });
    } catch {}

    try {
      const appointmentCol = this.connection.collection('appointments');
      activeConsultationsCount = await appointmentCol.countDocuments({ status: 'in_progress' });
    } catch {}

    try {
      const notifLogCol = this.connection.collection('pushlogs');
      failedNotificationsToday = await notifLogCol.countDocuments({
        createdAt: { $gte: today },
        status: 'failed',
      });
      successfulNotificationsToday = await notifLogCol.countDocuments({
        createdAt: { $gte: today },
        status: 'sent',
      });
    } catch {}

    try {
      const client = this.redis.getClient();
      // BullMQ wait list and active list sizes, plus failed zset size
      queueWaiting = await client.llen('bull:push_notifications:wait').catch(() => 0);
      queueActive = await client.llen('bull:push_notifications:active').catch(() => 0);
      queueFailed = await client.zcard('bull:push_notifications:failed').catch(() => 0);
    } catch {}

    try {
      const storageCol = this.connection.collection('storage_objects');
      const storageStats = await storageCol.aggregate([
        { $group: { _id: null, totalSize: { $sum: '$size_bytes' } } }
      ]).toArray();
      totalStorageBytes = storageStats[0]?.totalSize || 0;
    } catch {}

    const totalNotifications = successfulNotificationsToday + failedNotificationsToday;
    const notificationSuccessRate = totalNotifications > 0 
      ? parseFloat(((successfulNotificationsToday / totalNotifications) * 100).toFixed(1)) 
      : 100.0;

    const health = await this.getSystemHealth();

    return {
      active_online_users: activeUsersCount,
      active_calls_count: activeCallsCount,
      active_consultations_count: activeConsultationsCount,
      messages_today: messagesToday,
      calls_today: callsToday,
      failed_calls_today: failedCallsToday,
      push_metrics: {
        failed_today: failedNotificationsToday,
        successful_today: successfulNotificationsToday,
        success_rate_percent: notificationSuccessRate,
      },
      queue_metrics: {
        waiting: queueWaiting,
        active: queueActive,
        failed: queueFailed,
      },
      storage_metrics: {
        total_used_bytes: totalStorageBytes,
        total_used_mb: parseFloat((totalStorageBytes / 1024 / 1024).toFixed(2)),
      },
      system_health: health,
    };
  }
}

@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Public()
  @Post('log')
  log(
    @Req() req: Request,
    @CurrentUser() u: any,
    @Body() b: { event_type: string; domain: string; metadata?: any; session_id?: string }
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    const userId = u ? u.id : undefined;
    return this.svc.logEvent(userId, ip, ua, b);
  }

  @Public()
  @Get('popular')
  popular(@Query('domain') domain: string, @Query('limit') limit?: string) {
    return this.svc.popularSearches(domain || 'global', limit ? parseInt(limit, 10) : 10);
  }

  @Public()
  @Get('health')
  healthCheck() {
    return this.svc.getSystemHealth();
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get('dashboard')
  dashboardStats() {
    return this.svc.getDashboardStats();
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin-stats')
  adminStats(@Query('domain') domain?: string, @Query('period_days') days?: string) {
    return this.svc.getAdminStats(domain || 'all', days ? parseInt(days, 10) : 30);
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AnalyticsEvent', schema: AnalyticsEventSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
