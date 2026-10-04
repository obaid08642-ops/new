import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Public } from '../../common/auth.guard';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';

@Controller('nursing')
@UseGuards(JwtAuthGuard)
export class PatientNurseProfileController {
  constructor(@InjectConnection() private conn: Connection) {}
  // Q47: the `nurses` collection is empty and nothing writes it, so every
  // website nurse page was not found. Serve from `provider_profiles` — the same
  // real source (and the same view shape) as GET /home-care/providers/:id.
  // Q47: the website opens nurse pages without a session; the view below holds public fields only.
  @Public()
  @Get('nurses/:id')
  async one(_u: unknown, @Param('id') id: string) {
    const key = String(id);
    const p: any = await this.conn.db.collection('provider_profiles').findOne({
      $or: [{ account_id: { $eq: key } }, { id: { $eq: key } }],
      type: { $in: ['home_care', 'nursing', 'nurse'] },
      status: 'active',
      public_eligibility: true,
    } as any);
    if (!p) throw new NotFoundException('nurse_not_found');
    // The website books from this page: list the nurse's services from the
    // approved catalog (name, price, duration), the same rule HomeCareSvc.book applies.
    const keys = (p.nursing_services || []).map((x: any) => String(x?.key || '')).filter(Boolean);
    const rows: any[] = keys.length
      ? await this.conn.db.collection(CATALOG_COLLECTIONS.nursing_services).find({
        id: { $in: keys }, active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved',
      } as any).toArray()
      : [];
    const services = rows.map((s) => ({
      id: s.id, name_ar: s.name_ar, name_en: s.name_en, name: s.name_ar || s.name_en,
      price: typeof s.price === 'number' ? s.price : null, duration: s.duration ?? null,
    }));
    return {
      data: {
        id: p.account_id, profile_id: p.id,
        name_ar: p.name_ar || p.full_name || p.name_en, name: p.name_ar || p.full_name || p.name_en, name_en: p.name_en,
        gender: p.gender || null, degree: p.qualification || p.degree || null,
        facility_name: p.facility_name || p.organization_name || '', facility: p.facility_name || p.organization_name || '',
        rating: p.rating_count > 0 ? p.rating_avg : null, reviews_count: p.rating_count || 0, reviews: [],
        years_experience: p.years_experience || null, profile_photo: p.profile_photo || null,
        available_now: Boolean(p.availability?.accepting ?? true),
        services,
      },
    };
  }
}
