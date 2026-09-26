import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser } from '../../common/auth.guard';

const byStringOrObjectId = (id: string) => {
  const or: any[] = [{ id }, { _id: id }];
  if (/^[0-9a-fA-F]{24}$/.test(String(id))) or.push({ _id: new (require('mongoose').Types.ObjectId)(id) });
  return { $or: or };
};

@Controller('offers')
export class OffersDetailController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get(':id')
  async getOffer(@Param('id') id: string, @CurrentUser() user: any) {
    const offer: any = await this.conn.collection('promotioncampaigns').findOne(byStringOrObjectId(id) as any);
    if (!offer) throw new NotFoundException('العرض غير موجود');
    const provider = offer.provider_id
      ? await this.conn.collection('provider_profiles').findOne({
          $or: [{ id: offer.provider_id }, { user_id: offer.provider_id }, { account_id: offer.provider_id }],
        } as any)
      : null;
    return {
      id: offer.id || String(offer._id),
      title_ar: offer.title_ar, title_en: offer.title_en,
      original_price: offer.original_price, discounted_price: offer.discounted_price,
      image: offer.image_url, start_date: offer.start_date, end_date: offer.end_date,
      status: offer.status, target: offer.target_parameters || {},
      provider: provider ? { id: provider.id || String(provider._id), name: provider.name, specialty: provider.specialty, city: provider.city } : null,
    };
  }
}
