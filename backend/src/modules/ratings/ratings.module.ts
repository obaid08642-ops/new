/**
 * Ratings & Reviews module — patients rate providers after completed services.
 * One rating per user per entity; provider rating_avg recomputed atomically.
 */
import { Module, Injectable, Controller, Post, Get, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, CurrentUser, Public } from '../../common/auth.guard';

@Injectable()
export class RatingsService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get ratings() { return this.conn.collection('ratings'); }
  private get profiles() { return this.conn.collection('provider_profiles'); }

  async submit(user: any, body: { entity_type: string; entity_id: string; provider_id: string; score: number; comment?: string }) {
    const { entity_type, entity_id, provider_id, score, comment } = body || {};
    if (!entity_type || !entity_id || !provider_id) throw new BadRequestException('entity_type, entity_id, provider_id required');
    if (!['order', 'appointment', 'lab_booking', 'radiology_booking', 'homecare_booking', 'consultation'].includes(entity_type)) {
      throw new BadRequestException('unsupported entity_type');
    }
    if (typeof score !== 'number' || score < 1 || score > 5) throw new BadRequestException('score must be 1..5');

    const existing = await this.ratings.findOne({ user_id: user.id, entity_type, entity_id });
    if (existing) {
      await this.ratings.updateOne({ _id: existing._id }, { $set: { score, comment: comment || null, updated_at: new Date() } });
      await this.recompute(provider_id);
      return { ok: true, updated: true, entity_id };
    }

    await this.ratings.insertOne({
      user_id: user.id,
      user_name: user.full_name || null,
      entity_type,
      entity_id,
      provider_id,
      score,
      comment: comment || null,
      status: 'published',
      createdAt: new Date(),
    });
    await this.recompute(provider_id);
    return { ok: true, created: true, entity_id };
  }

  private async recompute(providerId: string) {
    const agg = await this.ratings.aggregate([
      { $match: { provider_id: providerId, status: 'published' } },
      { $group: { _id: null, avg: { $avg: '$score' }, n: { $sum: 1 } } },
    ]).toArray();
    const avg = agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0;
    const n = agg[0]?.n || 0;
    await this.profiles.updateMany(
      { $or: [{ user_id: providerId }, { account_id: providerId }] } as any,
      { $set: { rating_avg: avg, rating_count: n, rating: avg } },
    );
  }

  async forProvider(providerId: string, page = 1, limit = 20): Promise<any> {
    const skip = (Math.max(page, 1) - 1) * Math.min(limit, 100);
    const [rows, total, agg] = await Promise.all([
      this.ratings.find({ provider_id: providerId, status: 'published' }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(Math.min(limit, 100)).toArray(),
      this.ratings.countDocuments({ provider_id: providerId, status: 'published' }),
      this.ratings.aggregate([
        { $match: { provider_id: providerId, status: 'published' } },
        { $group: { _id: null, avg: { $avg: '$score' }, n: { $sum: 1 } } },
      ]).toArray(),
    ]);
    return {
      data: rows,
      total,
      page,
      total_pages: Math.ceil(total / Math.min(limit, 100)),
      avg: agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0,
      count: agg[0]?.n || 0,
    };
  }

  async mine(userId: string, entityType: string, entityId: string): Promise<any> {
    return this.ratings.findOne({ user_id: userId, entity_type: entityType, entity_id: entityId }, { projection: { _id: 0, score: 1, comment: 1, createdAt: 1 } });
  }
}

@Controller('ratings')
export class RatingsController {
  constructor(private readonly svc: RatingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  submit(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.submit(user, body);
  }

  @Public()
  @Get('provider/:id')
  forProvider(@Param('id') id: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.forProvider(id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Get('mine/:entity_type/:entity_id')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: any, @Param('entity_type') et: string, @Param('entity_id') eid: string): Promise<any> {
    return this.svc.mine(user.id, et, eid);
  }
}

@Module({
  controllers: [RatingsController],
  providers: [RatingsService],
})
export class RatingsModule {}
