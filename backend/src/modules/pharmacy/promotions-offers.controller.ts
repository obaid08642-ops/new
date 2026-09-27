import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {  } from '../../common/auth.guard';

const byStringOrObjectId = (id: string) => {
  const or: any[] = [{ id }, { _id: id }];
  if (/^[0-9a-fA-F]{24}$/.test(String(id))) or.push({ _id: new (require('mongoose').Types.ObjectId)(id) });
  return { $or: or };
};

@Controller('promotions/offers')
export class PromotionsOffersController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get(':id/providers')
  async offerProviders(@Param('id') id: string) {
    const offer: any = await this.conn.collection('promotioncampaigns').findOne(byStringOrObjectId(id) as any);
    if (!offer) throw new NotFoundException('العرض غير موجود');
    const ids: string[] = [offer.provider_id, ...(offer.provider_ids || [])].filter(Boolean).map(String);
    if (!ids.length) return [];
    const rows = await this.conn.collection('provider_profiles')
      .find({ $or: [{ id: { $in: ids } }, { user_id: { $in: ids } }, { account_id: { $in: ids } }] } as any)
      .limit(50).toArray();
    return rows.map((r: any) => ({
      id: r.id || String(r._id), name: r.name || r.facility_name || '',
      specialty: r.specialty, city: r.city,
      rating_avg: r.rating_avg ?? 0, rating_count: r.rating_count ?? 0,
    }));
  }
}
