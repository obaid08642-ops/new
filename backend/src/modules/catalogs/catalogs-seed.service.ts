import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Market-gap nursing additions (competitor audit).
 * Per-item upsert by code — deploys live automatically, never overwrites admin edits.
 */
const NURSING_ADDITIONS = [
  { code: 'dialysis_home', name_ar: 'غسيل كلى منزلي', name_en: 'Home Dialysis Session', category: 'specialized_care', price: 450, popularity: 40, description_ar: 'جلسة غسيل كلى منزلية بإشراف تمريضي متخصص.', description_en: 'Supervised home hemodialysis session.', image_url: 'https://cdn.nabd.plus/nursing/dialysis_home.png', is_active: true },
  { code: 'speech_therapy', name_ar: 'علاج النطق والتخاطب', name_en: 'Speech Therapy', category: 'specialized_care', price: 220, popularity: 45, description_ar: 'جلسات تخاطب للأطفال ومرضى الجلطات.', description_en: 'Speech sessions for children and stroke patients.', image_url: 'https://cdn.nabd.plus/nursing/speech_therapy.png', is_active: true },
  { code: 'lactation', name_ar: 'استشارة الرضاعة الطبيعية', name_en: 'Lactation Consultant', category: 'baby', price: 180, popularity: 55, description_ar: 'دعم الرضاعة للأمهات الجدد في المنزل.', description_en: 'In-home breastfeeding support for new mothers.', image_url: 'https://cdn.nabd.plus/nursing/lactation.png', is_active: true },
];

@Injectable()
export class CatalogsSeedService implements OnModuleInit {
  private readonly logger = new Logger(CatalogsSeedService.name);
  constructor(@InjectConnection() private readonly conn: Connection) {}

  async onModuleInit() {
    let ok = 0;
    for (const x of NURSING_ADDITIONS) {
      try {
        const r: any = await this.conn.collection('nursing_catalog').updateOne(
          { code: x.code },
          { $setOnInsert: { ...x, id: x.code } },
          { upsert: true },
        );
        if (r.upsertedCount || r.upsertedId) ok++;
      } catch { /* already live */ }
    }
    if (ok) this.logger.log(`Seeded ${ok} new nursing services`);
  }
}
