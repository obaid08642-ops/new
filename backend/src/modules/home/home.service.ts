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
    const campaigns = await this.promoModel.find({ status: 'active' }).limit(5).exec();
    return campaigns.map(c => ({
      t: c.title_ar,
      price: c.discounted_price,
      old: c.original_price,
      disc: Math.round(((c.original_price - c.discounted_price) / c.original_price) * 100) + '%',
      rating: 4.8,
      prov: c.provider_id || 'مستشفى',
      c: '#FF4B55',
      ic: 'local_offer',
      sponsored: c.target_parameters?.sponsored || false,
    }));
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

    return {
      date: dateStr,
      doctorName: 'طبيب نبض', // Normally join with provider profile to get name
      type: typeAr,
      time: timeStr
    };
  }

  async globalSearch(query: string) {
    if (!query || query.trim().length === 0) return [];
    
    const regex = new RegExp(query, 'i');
    const campaigns = await this.promoModel.find({
      $or: [{ title_ar: regex }, { title_en: regex }]
    }).limit(10).lean();

    return campaigns.map(c => ({
      id: c._id?.toString() || c.id,
      type: 'باقة',
      typeEn: 'Package',
      name: c.title_ar,
      nameEn: c.title_en || c.title_ar,
      sub: c.provider_id || 'عرض نبضة',
      subEn: c.provider_id || 'Nabd Offer',
      ic: 'science',
      c: '#7A6BEA',
      cs: '#F2F0FD',
      price: String(c.discounted_price || c.original_price || 0),
      priceEn: String(c.discounted_price || c.original_price || 0),
      sponsored: c.target_parameters?.sponsored || false,
    }));
  }
}
