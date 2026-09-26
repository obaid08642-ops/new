import { Controller, Get, Post, Body, Query, ForbiddenException, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { BookDto } from '../compat/compat.dto';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { HomeCareSvc } from './home-care.service';

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('home-care')
@SelfService()
@UseGuards(JwtAuthGuard)
export class PatientHomeCareController {
  constructor(
    @InjectConnection() private conn: Connection,
    private readonly homeSvc: HomeCareSvc,
  ) {}

  @Get('services')
  async services(@Query('limit') limit = '50') {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const docs = await this.conn.db
      .collection(CATALOG_COLLECTIONS.nursing_services)
      .find({ is_active: { $ne: false }, kind: { $ne: 'package' } } as any)
      .limit(lim)
      .toArray();
    return { data: docs.map(({ _id, ...d }: any) => d) };
  }

  @Get('packages')
  async packages(@Query('limit') limit = '50') {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const docs = await this.conn.db
      .collection(CATALOG_COLLECTIONS.nursing_services)
      .find({ is_active: { $ne: false }, kind: 'package' } as any)
      .limit(lim)
      .toArray();
    return { data: docs.map(({ _id, ...d }: any) => d) };
  }

  @Post('bookings')
  async book(@CurrentUser() u: any, @Body() body: BookDto) {
    const userId = uid(u);
    if (!userId) throw new ForbiddenException('authenticated_user_required');
    if (!body?.service_id && !body?.package_id) throw new BadRequestException('service_or_package_required');
    if (body.package_id && !body.service_id) {
      throw new BadRequestException('package_booking_not_supported_use_service');
    }
    const booking = await this.homeSvc.book(u, {
      service_id: body.service_id,
      scheduled_at: body.scheduled_at,
      notes: body.notes,
      payment_method: body.payment_method,
      ...(body.address_id ? { address: { address_id: body.address_id } } : {}),
    });
    const { _id, ...out } = booking as any;
    return { data: out };
  }

  @Get('bookings/my')
  async myBookings(@CurrentUser() u: any, @Query('limit') limit = '20', @Query('page') page = '1') {
    const userId = uid(u);
    if (!userId) throw new ForbiddenException('authenticated_user_required');
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const [canonical, legacy] = await Promise.all([
      this.homeSvc.mineFor(u).catch(() => []),
      this.conn.db
        .collection('home_care_bookings')
        .find({ patient_id: userId } as any)
        .sort({ created_at: -1 })
        .limit(lim)
        .toArray()
        .catch(() => []),
    ]);
    const merged = [...(canonical as any[]), ...(legacy as any[]).map(({ _id, ...d }: any) => d)]
      .sort((a: any, b: any) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime())
      .slice(0, lim);
    return { data: merged, page: parseInt(page, 10) || 1, limit: lim };
  }
}
