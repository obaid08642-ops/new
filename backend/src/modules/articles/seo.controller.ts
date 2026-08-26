import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../../common/auth.guard';

/**
 * Resolves public share-link slugs (/s/:type/:slug in the patient app) to real
 * entity ids. Only published/active entities resolve — no fabricated redirects.
 */
@Controller('seo')
export class SeoController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Public()
  @Get('resolve/:type/:slug')
  async resolve(@Param('type') type: string, @Param('slug') slug: string) {
    const s = decodeURIComponent(slug);
    const bySlugOrName = (extra: any = {}) => ({
      $or: [{ slug: s }, { id: s }, { name_ar: s }, { name_en: s }], ...extra,
    });

    let doc: any = null;
    if (type === 'medicine') {
      doc = await this.conn.collection('medicines_master').findOne(bySlugOrName({ is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1 } });
    } else if (type === 'doctor') {
      doc = await this.conn.collection('provider_profiles').findOne(bySlugOrName({ type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1, user_id: 1 } });
      if (doc && !doc.id) doc.id = doc.user_id;
    } else if (type === 'facility') {
      doc = await this.conn.collection('facilities').findOne(bySlugOrName({ is_active: true, public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1 } })
        || await this.conn.collection('provider_profiles').findOne(bySlugOrName({ type: { $in: ['hospital', 'clinic'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1, user_id: 1 } });
      if (doc && !doc.id) doc.id = doc.user_id;
    } else if (type === 'lab-service') {
      doc = await this.conn.collection('labservices').findOne(bySlugOrName({ active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1 } });
    } else if (type === 'home-care-service') {
      doc = await this.conn.collection('homecareservices').findOne(bySlugOrName({ active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1 } })
        || await this.conn.collection('labservices').findOne(bySlugOrName({ active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1 } });
    } else {
      throw new NotFoundException('unknown link type');
    }

    if (!doc?.id) throw new NotFoundException('link target not found');
    return { id: doc.id, type };
  }
}
