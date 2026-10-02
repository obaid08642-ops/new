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

  // R4: GET packages removed (dup of home-care-packages.controller).

  // P5.3d: alias of canonical POST /nursing/bookings — same single
  // implementation (HomeCareSvc.book). Kept because live clients call it.
  @Post('bookings')
  async book(@CurrentUser() u: any, @Body() body: BookDto) {
    const userId = uid(u);
    if (!userId) throw new ForbiddenException('authenticated_user_required');
    if (!body?.service_id && !body?.package_id) throw new BadRequestException('service_or_package_required');
    if (body.package_id && !body.service_id) {
      throw new BadRequestException('package_booking_not_supported_use_service');
    }
    // F3: resolve address_id against the caller's OWN saved addresses (refuse
    // another user's id) and pass line/city/lat/lng so the nurse sees the address.
    let address: any;
    if (body.address_id) {
      const profile: any = await this.conn?.collection('patient_profiles')?.findOne({ user_id: { $eq: userId } }, { projection: { addresses: 1 } });
      const a: any = (profile?.addresses || []).find((x: any) => x?.id === body.address_id);
      if (!a) throw new BadRequestException('address_not_found');
      address = { address_id: body.address_id, address: a.line1 || a.street || undefined, city: a.city || undefined, district: a.district || undefined, lat: a.lat, lng: a.lng };
    }
    const booking = await this.homeSvc.book(u, {
      service_id: body.service_id,
      scheduled_at: body.scheduled_at,
      // F3: keep the trimming the removed compat handler applied.
      notes: body.notes?.trim() || undefined,
      payment_method: body.payment_method,
      ...(address ? { address } : {}),
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
