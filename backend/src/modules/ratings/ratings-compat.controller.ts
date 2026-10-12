import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';

@Controller('patient-ux')
@UseGuards(JwtAuthGuard)
export class PatientReviewsListController {
  constructor(@InjectConnection() private conn: Connection) {}
  @Get('reviews')
  async list(@CurrentUser() u: any, @Query('target_id') targetId?: string, @Query('limit') limit = '20', @Query('page') page = '1') {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = Math.max((parseInt(page, 10) || 1) - 1, 0) * lim;
    const filter: any = {};
    if (targetId) filter.target_id = targetId;
    const docs = await this.conn.db.collection('reviews').find(filter).sort({ created_at: -1 }).skip(skip).limit(lim).toArray();
    // 779: privacy-safe reviewer + target labels (no ids, phones or emails).
    const patientIds = [...new Set(docs.map((d: any) => d?.patient_id).filter(Boolean))];
    const providerIds = [...new Set(docs.map((d: any) => d?.provider_id).filter(Boolean))];
    const [users, profiles] = await Promise.all([
      patientIds.length
        ? this.conn.db.collection('users').find({ id: { $in: patientIds } }, { projection: { _id: 0, id: 1, full_name: 1 } }).toArray().catch(() => [])
        : [],
      providerIds.length
        ? this.conn.db.collection('provider_profiles').find({ id: { $in: providerIds } }, { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1 } }).toArray().catch(() => [])
        : [],
    ]);
    const reviewerOf = new Map(users.map((x: any): [string, string | null] => [x.id, String(x.full_name || '').trim().split(/\s+/)[0] || null]));
    const targetOf = new Map(profiles.map((x: any): [string, string | null] => [x.id, x.name_ar || x.name_en || null]));
    const data = docs.map(({ _id, patient_id, ...d }: any) => ({
      ...d,
      reviewer_label: reviewerOf.get(patient_id) || null,
      target_label: targetOf.get((d as any)?.provider_id) || null,
    }));
    return { data, page: parseInt(page, 10) || 1, limit: lim };
  }
}
