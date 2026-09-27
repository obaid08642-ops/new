import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminSearchDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

/**
 * P6.x-11: global admin search across users, providers, orders and bookings
 * by id / phone / name. Capped, escaped, admin-only.
 */
@Controller('admin/search')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminSearchController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get()
  async search(@Query() dto: AdminSearchDto): Promise<any> {
    const q = (dto.q || '').trim();
    if (q.length < 2) throw new BadRequestException('query_too_short');
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = new RegExp(esc, 'i');
    const exact = { $eq: q };
    const [users, providers, orders, bookings] = await Promise.all([
      this.conn.collection('users').find(
        { $or: [{ id: exact }, { phone: exact }, { full_name: nameRe }, { name: nameRe }] } as any,
        { projection: { _id: 0, id: 1, full_name: 1, name: 1, phone: 1, email: 1, role: 1 } },
      ).limit(20).toArray(),
      this.conn.collection('provider_profiles').find(
        { $or: [{ id: exact }, { user_id: exact }, { account_id: exact }, { phone: exact }, { name_ar: nameRe }, { name_en: nameRe }] } as any,
        { projection: { _id: 0, id: 1, user_id: 1, name_ar: 1, name_en: 1, phone: 1, provider_type: 1, verification_status: 1 } },
      ).limit(20).toArray(),
      this.conn.collection('orders').find(
        { $or: [{ id: exact }, { tracking_id: exact }, { patient_phone: exact }] } as any,
        { projection: { _id: 0, id: 1, state: 1, total_price: 1, createdAt: 1 } },
      ).limit(20).toArray(),
      this.conn.collection('appointments').find(
        { $or: [{ id: exact }, { patient_phone: exact }, { patient_name: nameRe }] } as any,
        { projection: { _id: 0, id: 1, status: 1, doctor_id: 1, slot_start: 1 } },
      ).limit(20).toArray(),
    ]);
    return { q, users, providers, orders, bookings };
  }
}
