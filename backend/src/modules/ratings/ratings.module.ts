/**
 * Ratings & Reviews module — patients rate providers after completed services.
 * One rating per user per entity; provider rating_avg recomputed atomically.
 */
import { Module, Injectable, Controller, Post, Get, Body, Param, Query, UseGuards, BadRequestException, ForbiddenException, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { reviewerLabel } from './reviewer-label';
import { KillSwitchesService } from '../kill-switches/kill-switches.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, CurrentUser, Public, SelfService } from '../../common/auth.guard';
import { RejectReviewDto, SubmitDto } from './ratings.dto';
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

  async submit(user: any, body: { entity_type: string; entity_id: string; provider_id: string; score: number; comment?: string; sub_ratings?: { doctor?: number; clinic?: number; waiting?: number } }) {
    // Issue 955: the admin kill switch stops new reviews before anything is stored.
    await this.killSwitches?.assertOn('reviews_enabled');
    const { entity_type, entity_id, provider_id, score, comment } = body || {};
    const subRatings = RatingsService.cleanSubRatings(body?.sub_ratings);
    if (!entity_type || !entity_id || !provider_id) throw new BadRequestException('entity_type, entity_id, provider_id required');
    if (!['order', 'appointment', 'lab_booking', 'radiology_booking', 'homecare_booking', 'consultation'].includes(entity_type)) {
      throw new BadRequestException('unsupported entity_type');
    }
    if (typeof score !== 'number' || score < 1 || score > 5) throw new BadRequestException('score must be 1..5');
    // Sub-ratings (doctor / clinic / waiting) belong to a doctor's appointment only.
    if (subRatings && !['appointment', 'consultation'].includes(entity_type)) throw new BadRequestException('sub_ratings_for_appointments_only');

    // 16.12: a review comes from a finished service the reviewer used, and is about the provider who did it. The client's
    // provider_id is not trusted (it was how anyone could rate any provider with an invented entity id).
    const verified = await this.verifiedProvider(user.id, entity_type, entity_id);
    if (!verified.ok) throw new ForbiddenException(verified.reason);
    if (provider_id !== verified.providerId) throw new BadRequestException('provider_mismatch');

    const existing = await this.ratings.findOne({ user_id: user.id, entity_type, entity_id });
    // Written reviews are moderated (owner decision 2026-10-24): a review with text waits for an admin; a stars-only rating
    // counts at once. Changing the text sends the review back to the admin.
    const written = typeof comment === 'string' && comment.trim().length > 0;
    if (existing) {
      const textChanged = (existing.comment || null) !== (comment || null);
      const status = written ? (textChanged || existing.status === 'pending' ? 'pending' : existing.status) : 'published';
      await this.ratings.updateOne({ _id: existing._id }, { $set: { score, comment: comment || null, sub_ratings: subRatings ?? existing.sub_ratings ?? null, status, updated_at: new Date() } });
      await this.recompute(provider_id);
      return { ok: true, updated: true, entity_id, status };
    }

    await this.ratings.insertOne({
      id: randomUUID(),
      user_id: user.id,
      user_name: user.full_name || null,
      entity_type,
      entity_id,
      provider_id,
      score,
      comment: comment || null,
      sub_ratings: subRatings,
      status: written ? 'pending' : 'published',
      createdAt: new Date(),
    });
    await this.recompute(provider_id);
    return { ok: true, created: true, entity_id, status: written ? 'pending' : 'published' };
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
    const sub = await this.ratings.aggregate([
      { $match: { provider_id: providerId, status: 'published', sub_ratings: { $type: 'object' } } },
      { $group: { _id: null, doctor: { $avg: '$sub_ratings.doctor' }, clinic: { $avg: '$sub_ratings.clinic' }, waiting: { $avg: '$sub_ratings.waiting' } } },
    ]).toArray();
    const round1 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
    await this.profiles.updateMany(
      { $or: [{ user_id: providerId }, { account_id: providerId }] } as any,
      { $set: { rating_avg: avg, rating_count: n, rating: avg, sub_ratings_avg: { doctor: round1(sub[0]?.doctor), clinic: round1(sub[0]?.clinic), waiting: round1(sub[0]?.waiting) } } },
    );
  }

  /** Only the three known keys, each an integer 1..5; null when none was sent. */
  static cleanSubRatings(v: any): { doctor?: number; clinic?: number; waiting?: number } | undefined {
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'object' || Array.isArray(v)) throw new BadRequestException('invalid_sub_ratings');
    const out: Record<string, number> = {};
    for (const k of ['doctor', 'clinic', 'waiting']) {
      if (v[k] === undefined) continue;
      if (!Number.isInteger(v[k]) || v[k] < 1 || v[k] > 5) throw new BadRequestException('sub_rating_must_be_1_to_5');
      out[k] = v[k];
    }
    return Object.keys(out).length ? out : undefined;
  }

  /** Admin moderation queue: written reviews waiting for a decision, oldest first. The admin sees the reviewer's full name. */
  async pendingReviews(page = 1, limit = 20): Promise<{ data: unknown[]; total: number; page: number }> {
    const lim = Math.min(Math.max(limit, 1), 100);
    const filter = { status: 'pending', id: { $type: 'string' } };
    const [rows, total] = await Promise.all([
      this.ratings.find(filter, { projection: { _id: 0, user_id: 0 } }).sort({ createdAt: 1 }).skip((Math.max(page, 1) - 1) * lim).limit(lim).toArray(),
      this.ratings.countDocuments(filter),
    ]);
    return { data: rows, total, page };
  }

  async moderate(admin: any, id: string, decision: 'approve' | 'reject', reason?: string) {
    const existing: any = await this.ratings.findOne({ id: { $eq: String(id) }, status: 'pending' });
    if (!existing) throw new NotFoundException('review_not_pending');
    const status = decision === 'approve' ? 'published' : 'rejected';
    await this.ratings.updateOne({ _id: existing._id }, { $set: { status, moderated_by: admin?.id ?? null, moderated_at: new Date(), moderation_reason: decision === 'reject' ? (reason || null) : null } });
    await this.recompute(existing.provider_id);
    return { ok: true, id, status };
  }

  async forProvider(providerId: string, page = 1, limit = 20): Promise<any> {
    const skip = (Math.max(page, 1) - 1) * Math.min(limit, 100);
    const [rows, total, agg] = await Promise.all([
      // A public list: score, comment, date and the reviewer's first name only. user_id, the full name and the booked
      // entity id stay private (they identify the patient and the visit).
      this.ratings.find({ provider_id: providerId, status: 'published' }, { projection: { _id: 0, score: 1, comment: 1, createdAt: 1, user_name: 1, sub_ratings: 1 } }).sort({ createdAt: -1 }).skip(skip).limit(Math.min(limit, 100)).toArray(),
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
        reviewer: reviewerLabel(r.user_name),
        sub_ratings: r.sub_ratings ?? null,
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

@Controller('admin/ratings')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminRatingsController {
  constructor(private readonly svc: RatingsService) {}

  @RequirePermissions(Permission.REVIEWS_MODERATE)
  @Get('pending')
  pending(@Query('page') page?: string, @Query('limit') limit?: string): Promise<{ data: unknown[]; total: number; page: number }> {
    return this.svc.pendingReviews(page ? parseInt(page, 10) || 1 : 1, limit ? parseInt(limit, 10) || 20 : 20);
  }

  @RequirePermissions(Permission.REVIEWS_MODERATE)
  @Post(':id/approve')
  approve(@CurrentUser() admin: any, @Param('id') id: string) { return this.svc.moderate(admin, id, 'approve'); }

  @RequirePermissions(Permission.REVIEWS_MODERATE)
  @Post(':id/reject')
  reject(@CurrentUser() admin: any, @Param('id') id: string, @Body() body: RejectReviewDto) { return this.svc.moderate(admin, id, 'reject', body?.reason); }
}

@Module({
  controllers: [RatingsController, AdminRatingsController, PatientReviewsListController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
