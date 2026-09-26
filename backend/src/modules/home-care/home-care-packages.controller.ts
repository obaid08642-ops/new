import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SelfService } from '../../common/auth.guard';

@Controller('home-care/packages')
export class HomeCarePackagesController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get()
  async list() {
    const services = await this.conn
      .collection('homecareservices')
      .find({ $or: [{ active: true }, { is_active: true }, { status: 'active' }] } as any)
      .limit(100)
      .toArray();
    const data = services.map((s: any) => ({
      id: s.id || String(s._id),
      name_ar: s.name_ar,
      name_en: s.name_en || null,
      price: s.price ?? 0,
      duration: s.duration || null,
      category: s.category || 'nursing',
    }));
    return { data };
  }
}
