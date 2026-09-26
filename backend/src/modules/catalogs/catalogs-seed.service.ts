import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { CATALOG_COLLECTIONS } from './catalog-collections';

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
    setImmediate(() =>
      this.seed().catch((e: any) => this.logger.warn(`Background catalogs seed failed: ${e?.message}`)),
    );
  }

  private async seed() {
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
    // P5.1: seed-data JSONs are the insert-only bootstrap source (never a read
    // fallback). Same keys as the one-shot migration script.
    ok = 0;
    try {
      const dir = path.join(__dirname, 'seed-data');
      const slug = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'item';
      const read = (f: string): any[] => {
        try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return []; }
      };
      for (const x of read('labs.json')) {
        const code = x.short_code || slug(x.name_en);
        try {
          const r: any = await this.conn.collection(CATALOG_COLLECTIONS.lab_services).updateOne(
            { test_code: code }, { $setOnInsert: { ...x, test_code: code, id: x.id || code } }, { upsert: true });
          if (r.upsertedCount || r.upsertedId) ok++;
        } catch { /* already live */ }
      }
      for (const x of read('radiology.json')) {
        const code = x.short_code || slug(x.name_en);
        try {
          const r: any = await this.conn.collection(CATALOG_COLLECTIONS.radiology_services).updateOne(
            { short_code: code }, { $setOnInsert: { ...x, id: x.id || code } }, { upsert: true });
          if (r.upsertedCount || r.upsertedId) ok++;
        } catch { /* already live */ }
      }
      for (const x of read('nursing.json')) {        const id = x.id || slug(x.name_en);
        try {
          const r: any = await this.conn.collection('nursing_catalog').updateOne(
            { id }, { $setOnInsert: { ...x, id, code: x.code || id } }, { upsert: true });
          if (r.upsertedCount || r.upsertedId) ok++;
        } catch { /* already live */ }
      }
      for (const x of read('specialties.json')) {
        const code = x.code || slug(x.name_en);
        try {
          const r: any = await this.conn.collection('specialties').updateOne(
            { code }, { $setOnInsert: { ...x, code } }, { upsert: true });
          if (r.upsertedCount || r.upsertedId) ok++;
        } catch { /* already live */ }
      }
      for (const x of read('insurance.json')) {
        try {
          const co: any = await this.conn.collection('insurancecompanies').findOne({ code: x.code });
          let companyId = co?.id;
          if (!co) {
            companyId = require('uuid').v4();
            await this.conn.collection('insurancecompanies').updateOne({ code: x.code },
              { $setOnInsert: { id: companyId, code: x.code, name_ar: x.name_ar, name_en: x.name_en, logo_url: x.image_url, is_active: x.is_active !== false, catalog_status: 'pending_review', provenance: 'seed-data' } },
              { upsert: true });
            ok++;
          }
          for (const t of x.plans || []) {
            try {
              const r: any = await this.conn.collection('insurance_networks').updateOne(
                { company_id: companyId, code: `tier-${t.tier_level}` },
                { $setOnInsert: { id: require('uuid').v4(), company_id: companyId, code: `tier-${t.tier_level}`, name_ar: t.name_ar, name_en: t.name_en, tier_level: t.tier_level, catalog_status: 'pending_review', provenance: 'seed-data' } },
                { upsert: true });
              if (r.upsertedCount || r.upsertedId) ok++;
            } catch { /* already live */ }
          }
        } catch { /* already live */ }
      }
    } catch (e: any) {
      this.logger.warn(`Catalog seed-data bootstrap failed: ${e?.message}`);
    }
    if (ok) this.logger.log(`Seeded ${ok} catalog docs from seed-data`);
  }
}
