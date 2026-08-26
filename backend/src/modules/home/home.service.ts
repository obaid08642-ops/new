import { Injectable, Inject, ExecutionContext } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromotionCampaign, PromotionCampaignDocument } from '../../schemas/promotion-campaign.schema';
import { Appointment, AppointmentDocument } from '../../schemas/appointment.schema';
import { REQUEST } from '@nestjs/core';

@Injectable()
export class HomeService {
  constructor(
    @InjectModel(PromotionCampaign.name) private promoModel: Model<PromotionCampaignDocument>,
    @InjectModel(Appointment.name) private apptModel: Model<AppointmentDocument>,
    @Inject(REQUEST) private request: any,
  ) {}

  async getOffers() {
    const campaigns = await this.promoModel.find({ status: 'active' }).limit(10).exec();

    // Resolve real provider names/ratings — never expose raw ids or fake ratings
    const providerIds = [...new Set(campaigns.map((c: any) => c.provider_id).filter(Boolean).map(String))];
    const providers: any[] = providerIds.length
      ? await this.promoModel.db.collection('provider_profiles')
          .find({ $or: [{ id: { $in: providerIds } }, { user_id: { $in: providerIds } }, { account_id: { $in: providerIds } }] } as any)
          .toArray()
      : [];
    const provMap = new Map<string, any>();
    for (const p of providers) {
      for (const key of [p.id, p.user_id, p.account_id].filter(Boolean)) provMap.set(String(key), p);
    }

    return campaigns.map(c => {
      const prov = c.provider_id ? provMap.get(String(c.provider_id)) : null;
      return {
        id: (c as any).id || String((c as any)._id),
        t: c.title_ar,
        price: c.discounted_price,
        old: c.original_price,
        disc: Math.round(((c.original_price - c.discounted_price) / c.original_price) * 100) + '%',
        rating: prov?.rating_avg ?? null,
        prov: prov?.name || prov?.facility_name || 'شريك نبض',
        c: '#FF4B55',
        ic: 'local_offer',
        sponsored: c.target_parameters?.sponsored || false,
      };
    });
  }

  async getUpcomingAppointment() {
    const userId = this.request.user?.id;
    if (!userId) return null;

    const upcoming = await this.apptModel.findOne({
      patient_id: userId,
      status: { $in: ['PENDING', 'CONFIRMED'] },
      slot_start: { $gte: new Date() }
    }).sort({ slot_start: 1 }).exec();

    if (!upcoming) return null;

    const dateStr = upcoming.slot_start.toISOString().split('T')[0];
    const timeStr = upcoming.slot_start.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    let typeAr = 'استشارة في العيادة';
    if (upcoming.service_type === 'video') typeAr = 'استشارة فيديو';
    else if (upcoming.service_type === 'home') typeAr = 'زيارة منزلية';

    // Resolve the real doctor name from the provider profile (doctor_id = provider_profile.id)
    let doctorName = '';
    if (upcoming.doctor_id) {
      const prov: any = await this.apptModel.db.collection('provider_profiles').findOne({
        $or: [{ id: upcoming.doctor_id }, { user_id: upcoming.doctor_user_id }, { account_id: upcoming.doctor_id }],
      } as any);
      doctorName = prov?.name || '';
    }

    return {
      id: (upcoming as any).id || String((upcoming as any)._id),
      date: dateStr,
      doctorName: doctorName || null,
      type: typeAr,
      time: timeStr
    };
  }

  /**
   * Global search across all ecosystem domains (S19):
   * doctors, medicines, labs, radiology, articles, disease info, insurance,
   * community, the requester's own family members, and sponsored packages.
   * Every result is a real DB document — empty domains simply return nothing.
   */
  async globalSearch(query: string) {
    const q = (query || '').trim();
    if (q.length === 0) return [];

    // Escape user input — a raw RegExp(query) throws on '[' and is ReDoS-prone
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const db = this.promoModel.db;
    const userId = this.request.user?.id;

    const [campaigns, doctors, medicines, labs, rads, articles, diseaseArticles, insurers, posts, familyGroup]: any[] =
      await Promise.all([
        this.promoModel.find({ $or: [{ title_ar: regex }, { title_en: regex }] }).limit(10).lean(),
        db.collection('provider_profiles').find({
          type: 'doctor', status: 'active',
          $or: [{ name_ar: regex }, { name_en: regex }, { specialty: regex }, { hospital: regex }],
        } as any).limit(6).toArray(),
        db.collection('medicines_master').find({
          verified: true,
          $or: [{ name_ar: regex }, { name_en: regex }, { active_ingredient: regex }],
        } as any).limit(6).toArray(),
        db.collection('labservices').find({
          $or: [{ name_ar: regex }, { name_en: regex }, { short_code: regex }],
        } as any).limit(5).toArray(),
        db.collection('radiologyservices').find({
          $or: [{ name_ar: regex }, { name_en: regex }, { body_part: regex }],
        } as any).limit(5).toArray(),
        db.collection('articles').find({
          status: 'PUBLISHED',
          $or: [{ title_ar: regex }, { title_en: regex }, { excerpt_ar: regex }, { tags: regex }],
        } as any).limit(5).toArray(),
        // Disease info = real published content in the chronic-diseases category
        db.collection('articles').find({
          status: 'PUBLISHED', category: 'أمراض مزمنة',
          $or: [{ title_ar: regex }, { excerpt_ar: regex }, { tags: regex }],
        } as any).limit(3).toArray(),
        db.collection('insurance_companies').find({
          is_active: true,
          $or: [{ name_ar: regex }, { name_en: regex }, { code: regex }],
        } as any).limit(4).toArray(),
        db.collection('community_posts').find({
          status: 'published', is_deleted: false,
          $or: [{ title: regex }, { body: regex }, { tags: regex }],
        } as any).limit(5).toArray(),
        // Family search is strictly scoped to the requester's own group
        userId
          ? db.collection('family_groups').findOne({ 'members.user_id': userId } as any)
          : Promise.resolve(null),
      ]);

    // Resolve provider names so we never show raw ids as the subtitle
    const providerIds = [...new Set(campaigns.map((c: any) => c.provider_id).filter(Boolean).map(String))];
    const providers: any[] = providerIds.length
      ? await db.collection('provider_profiles')
          .find({ $or: [{ id: { $in: providerIds } }, { user_id: { $in: providerIds } }, { account_id: { $in: providerIds } }] } as any)
          .toArray()
      : [];
    const provMap = new Map<string, any>();
    for (const p of providers) {
      for (const key of [p.id, p.user_id, p.account_id].filter(Boolean)) provMap.set(String(key), p);
    }

    const results: any[] = [];

    for (const c of campaigns) {
      const provName = (c.provider_id && (provMap.get(String(c.provider_id))?.name || provMap.get(String(c.provider_id))?.facility_name)) || null;
      results.push({
        id: c._id?.toString() || c.id,
        type: 'باقة', typeEn: 'Package',
        name: c.title_ar, nameEn: c.title_en || c.title_ar,
        sub: provName || 'عرض نبض', subEn: provName || 'Nabd Offer',
        ic: 'local_offer', c: '#7A6BEA', cs: '#F2F0FD',
        price: String(c.discounted_price || c.original_price || 0),
        priceEn: String(c.discounted_price || c.original_price || 0),
        sponsored: c.target_parameters?.sponsored || false,
      });
    }

    for (const d of doctors) {
      const rating = d.rating ?? d.rating_avg;
      results.push({
        id: d.id, type: 'دكتور', typeEn: 'Doctor',
        name: d.name_ar || d.name_en, nameEn: d.name_en || d.name_ar,
        sub: d.specialty || 'طبيب', subEn: d.specialty || 'Doctor',
        ic: 'stethoscope', c: '#2E86FF', cs: '#EAF3FF',
        rate: rating != null ? String(rating) : null,
        rateEn: rating != null ? String(rating) : null,
        price: d.price_clinic != null ? String(d.price_clinic) : null,
        priceEn: d.price_clinic != null ? String(d.price_clinic) : null,
      });
    }

    for (const m of medicines) {
      results.push({
        id: m.id, type: 'دواء', typeEn: 'Medicine',
        name: m.name_ar, nameEn: m.name_en || m.name_ar,
        sub: m.active_ingredient || m.manufacturer || 'دواء',
        subEn: m.active_ingredient || m.manufacturer || 'Medicine',
        ic: 'pill', c: '#FF4B55', cs: '#FFEBEC',
        price: m.price != null ? String(m.price) : null,
        priceEn: m.price != null ? String(m.price) : null,
      });
    }

    for (const l of labs) {
      results.push({
        id: l.id, type: 'تحليل', typeEn: 'Lab',
        name: l.name_ar, nameEn: l.name_en || l.name_ar,
        sub: l.short_code || 'تحليل مختبر', subEn: l.short_code || 'Lab test',
        ic: 'biotech', c: '#00A0AF', cs: '#E5F7F9',
        price: l.price != null ? String(l.price) : null,
        priceEn: l.price != null ? String(l.price) : null,
      });
    }

    for (const r of rads) {
      results.push({
        id: r.id, type: 'أشعة', typeEn: 'Radiology',
        name: r.name_ar, nameEn: r.name_en || r.name_ar,
        sub: r.body_part || 'أشعة', subEn: r.body_part || 'Radiology',
        ic: 'radiology', c: '#8E44AD', cs: '#F3EAF7',
        price: r.price != null ? String(r.price) : null,
        priceEn: r.price != null ? String(r.price) : null,
      });
    }

    const articleSlugs = new Set<string>();
    for (const a of articles) {
      articleSlugs.add(a.slug);
      results.push({
        id: a.slug, slug: a.slug, type: 'مقال', typeEn: 'Article',
        name: a.title_ar, nameEn: a.title_en || a.title_ar,
        sub: a.category || 'مقال صحي', subEn: a.category || 'Health article',
        ic: 'article', c: '#5BA84F', cs: '#EDF6EC',
      });
    }

    for (const a of diseaseArticles) {
      if (articleSlugs.has(a.slug)) continue; // already listed as an article
      results.push({
        id: a.slug, slug: a.slug, type: 'مرض', typeEn: 'Disease',
        name: a.title_ar, nameEn: a.title_en || a.title_ar,
        sub: 'معلومات طبية', subEn: 'Medical info',
        ic: 'healing', c: '#E67E22', cs: '#FCF0E3',
      });
    }

    for (const i of insurers) {
      results.push({
        id: i.id, type: 'تأمين', typeEn: 'Insurance',
        name: i.name_ar, nameEn: i.name_en || i.name_ar,
        sub: 'شركة تأمين', subEn: 'Insurance company',
        ic: 'health_and_safety', c: '#1ABC9C', cs: '#E6F8F5',
      });
    }

    for (const p of posts) {
      results.push({
        id: p.id, type: 'مجتمع', typeEn: 'Community',
        name: p.title, nameEn: p.title,
        sub: `${p.upvotes ?? 0} إعجاب · ${p.comment_count ?? 0} تعليق`,
        subEn: `${p.upvotes ?? 0} likes · ${p.comment_count ?? 0} comments`,
        ic: 'groups', c: '#F5A623', cs: '#FEF4E4',
      });
    }

    if (familyGroup?.members?.length) {
      for (const m of familyGroup.members) {
        if (!regex.test(m.display_name || '') && !regex.test(m.relation || '')) continue;
        results.push({
          id: m.user_id, type: 'عائلة', typeEn: 'Family',
          name: m.display_name || 'فرد من العائلة', nameEn: m.display_name || 'Family member',
          sub: m.relation || 'عائلتي', subEn: m.relation || 'My family',
          ic: 'family_restroom', c: '#E84393', cs: '#FDEAF3',
        });
      }
    }

    return results;
  }
}
