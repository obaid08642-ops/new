import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {  } from '../../common/auth.guard';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';

@Controller('provider/capabilities')
export class CapabilitiesCatalogController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('lab-services')
  async labServices() {
    const rows = await this.conn.collection(CATALOG_COLLECTIONS.lab_services).find({ active: { $ne: false } } as any).limit(300).toArray();
    return rows.map((s: any) => ({
      id: s.id || String(s._id), name_ar: s.name_ar, name_en: s.name_en,
      price: s.price, category: s.category, prep: s.prep_instructions || s.prep || null,
    }));
  }

  @Get('radiology-services')
  async radiologyServices() {
    const rows = await this.conn.collection(CATALOG_COLLECTIONS.radiology_services).find({ active: { $ne: false } } as any).limit(300).toArray();
    return rows.map((s: any) => ({
      id: s.id || String(s._id), name_ar: s.name_ar, name_en: s.name_en,
      price: s.price, category: s.category, modality: s.modality || null,
    }));
  }
}
