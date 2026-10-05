import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Public } from '../../common/auth.guard';

@Controller('labs')
@UseGuards(JwtAuthGuard)
export class PatientLabsCatalogController {
  constructor(@InjectConnection() private conn: Connection) {}
  // Q48: `labs_catalog` is empty and nothing writes it. The lab is a provider,
  // so read the lab's provider profile and its real `lab_services`.
  // Q47/Q48: the website opens lab pages without a session, so the detail is public,
  // and only public fields leave (never IBAN, tax/CR numbers, documents, commissions).
  @Public()
  @Get(':id')
  async one(_u: unknown, @Param('id') id: string) {
    const key = String(id);
    const p: any = await this.conn.db.collection('provider_profiles').findOne({
      $or: [{ account_id: { $eq: key } }, { id: { $eq: key } }],
      type: { $in: ['laboratory', 'lab'] },
      status: 'active',
      public_eligibility: true,
    } as any);
    if (!p) throw new NotFoundException('lab_not_found');
    const services: any[] = await this.conn.db.collection('lab_services')
      .find({ $or: [{ lab_id: p.account_id }, { provider_id: p.account_id }, { lab_account_id: p.account_id }], active: { $ne: false } } as any)
      .limit(200).toArray().catch(() => []);
    return {
      data: {
        id: p.account_id, profile_id: p.id,
        name_ar: p.name_ar || p.name_en, name: p.name_ar || p.name_en, name_en: p.name_en,
        city: p.city || null, district: p.district || null,
        address: typeof p.address === 'string' ? p.address : null,
        image: p.logo || null,
        rating: p.rating_count > 0 ? p.rating_avg : null, reviews_count: p.rating_count || 0,
        home_visit: Boolean(p.home_visit_supported),
        services: services.map(({ _id, ...s }: any) => s),
      },
    };
  }
}
