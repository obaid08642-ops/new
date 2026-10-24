/**
 * Ratings & Reviews module — patients rate providers after completed services.
 * One rating per user per entity; provider rating_avg recomputed atomically.
 */
import { Module, Injectable, Controller, Post, Get, Body, Param, Query, UseGuards, BadRequestException, ForbiddenException, Optional } from '@nestjs/common';
import { KillSwitchesService } from '../kill-switches/kill-switches.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, CurrentUser, Public, SelfService } from '../../common/auth.guard';
import { SubmitDto } from './ratings.dto';
import { PatientReviewsListController } from './ratings-compat.controller';

/** The collection and the final states of every kind of service a patient can review (same states as POST /patient-ux/review). */
const REVIEWABLE: Record<string, { collection: string; done: string[] }> = {
  order: { collection: 'pharmacy_orders', done: ['DELIVERED', 'COMPLETED'] },
  appointment: { collection: 'appointments', done: ['COMPLETED'] },
  consultation: { collection: 'appointments', done: ['COMPLETED'] },
  lab_booking: { collection: 'labbookings', done: ['REPORTED', 'RESULT_READY', 'COMPLETED'] },
  radiology_booking: { collection: 'radiologybookings', done: ['REPORT_READY', 'REPORT_PUBLISHED', 'COMPLETED'] },
  homecare_booking: { collection: 'homecarebookings', done: ['COMPLETED'] },
};

@Injectable()
export class RatingsService {
  constructor(@InjectConnection() private readonly conn: Connection, @Optional() private readonly killSwitches?: KillSwitchesService) {}

  private get ratings() { return this.conn.collection('ratings'); }
  private get profiles() { return this.conn.collection('provider_profiles'); }

  async submit(user: any, body: { entity_type: string; entity_id: string; provider_id: string; score: number; comment?: string }) {
    // Issue 955: the admin kill switch stops new reviews before anything is stored.
    await this.killSwitches?.assertOn('reviews_enabled');
    const { entity_type, entity_id, provider_id, score, comment } = body || {};
    if (!entity_type || !entity_id || !provider_id) throw new BadRequestException('entity_type, entity_id, provider_id required');
    if (!['order', 'appointment', 'lab_booking', 'radiology_booking', 'homecare_booking', 'consultation'].includes(entity_type)) {
      throw new BadRequestException('unsupported entity_type');
    }
    if (typeof score !== 'number' || score < 1 || score > 5) throw new BadRequestException('score must be 1..5');

    // 16.12: a review comes from a finished service the reviewer used, and is about the provider who did it. The client's
    // provider_id is not trusted (it was how anyone could rate any provider with an invented entity id).
    const verified = await this.verifiedProvider(user.id, entity_type, entity_id);
    if (!verified.ok) throw new ForbiddenException(verified.reason);
    if (provider_id !== verified.providerId) throw new BadRequestException('provider_mismatch');

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

  /**
   * The provider of a finished service owned by `userId`, or the reason it cannot be reviewed.
   * Pharmacy orders live in pharmacy_orders (the provider is the selected allocation's pharmacy); every other kind is one
   * document with an owner field, a terminal state and a provider field.
   */
  async verifiedProvider(userId: string, entityType: string, entityId: string): Promise<{ ok: boolean; providerId?: string; reason?: string }> {
    const spec = REVIEWABLE[entityType];
    if (!spec) return { ok: false, reason: 'unsupported_entity_type' };
    const id = String(entityId);
    let doc: any;
    let provider: string | null = null;
    if (entityType === 'order') {
      doc = await this.conn.collection('pharmacy_orders').findOne({ id: { $eq: id } });
      if (doc) {
        const alloc: any = doc.selected_allocation_id ? await this.conn.collection('pharmacy_allocations').findOne({ id: { $eq: String(doc.selected_allocation_id) } }) : null;
        provider = alloc?.pharmacy_account_id ?? null;
      }
    } else {
      doc = await this.conn.collection(spec.collection).findOne({ id: { $eq: id } });
      if (doc) provider = [doc.provider_id, doc.provider_account_id, doc.assigned_provider_id, doc.doctor_user_id, doc.doctor_id, doc.pharmacy_id].find((v) => typeof v === 'string' && v) ?? null;
    }
    if (!doc) return { ok: false, reason: 'service_not_found' };
    const owner = doc.patient_account_id ?? doc.patient_id;
    if (String(owner ?? '') !== String(userId)) return { ok: false, reason: 'not_owner' };
    const state = String(doc.status ?? doc.state ?? '').toUpperCase();
    if (!spec.done.includes(state)) return { ok: false, reason: `review_allowed_after_${spec.done[0].toLowerCase()}` };
    if (!provider) return { ok: false, reason: 'no_provider' };
    return { ok: true, providerId: provider };
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
      // A public list: score, comment, date and the reviewer's first name only. user_id, the full name and the booked
      // entity id stay private (they identify the patient and the visit).
      this.ratings.find({ provider_id: providerId, status: 'published' }, { projection: { _id: 0, score: 1, comment: 1, createdAt: 1, user_name: 1 } }).sort({ createdAt: -1 }).skip(skip).limit(Math.min(limit, 100)).toArray(),
      this.ratings.countDocuments({ provider_id: providerId, status: 'published' }),
      this.ratings.aggregate([
        { $match: { provider_id: providerId, status: 'published' } },
        { $group: { _id: null, avg: { $avg: '$score' }, n: { $sum: 1 } } },
      ]).toArray(),
    ]);
    return {
      data: rows.map((r: any) => ({
        score: r.score,
        comment: r.comment ?? null,
        createdAt: r.createdAt ?? null,
        reviewer: typeof r.user_name === 'string' && r.user_name.trim() ? r.user_name.trim().split(/\s+/)[0].slice(0, 30) : null,
      })),
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
@SelfService()
export class RatingsController {
  constructor(private readonly svc: RatingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  submit(@CurrentUser() user: any, @Body() body: SubmitDto) {
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
  controllers: [RatingsController, PatientReviewsListController],
  providers: [RatingsService],
})
export class RatingsModule {}
