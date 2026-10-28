import { Controller, Get, Post, Body, Query, ForbiddenException, BadRequestException, UseGuards, Param } from '@nestjs/common';
import { Public } from '../../common/auth.guard';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { BookDto } from '../compat/compat.dto';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { HomeCareSvc } from './home-care.service';
import { PublicCache } from '../../common/public-cache.decorator';
import { nearestFirst } from '../provider/services/nearest-first';

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

  @PublicCache(20, ['provider-slots'], { cacheControl: 'public, s-maxage=20' })
  @Public() @Get('providers/:providerAccountId/slots')
  providerSlots(
    @Param('providerAccountId') providerAccountId: string,
    @Query('date') date: string,
    @Query('duration') duration?: string
  ) {
    const dur = duration ? parseInt(duration, 10) : 30;
    if (!Number.isInteger(dur) || dur < 10 || dur > 120) {
      throw new BadRequestException('duration must be an integer between 10 and 120 minutes');
    }
    return this.homeSvc.slotsForProvider(providerAccountId, date, dur);
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

  // #645: search and filters for nursing services. Nursing is always a home visit and ratings belong
  // to nurses, not services, so the filters are the catalog's own fields: text, category, price.
  // With lat/lng the list is ordered nearest-first by the closest approved nurse offering the
  // service (provider_profiles.nursing_services[].key, the same rule HomeCareSvc.book enforces).
  // Live tracking (#647) is GET /nursing/visits/:id/tracking.
  @Get('services/search')
  async searchServices(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('min_price') minPrice?: string,
    @Query('max_price') maxPrice?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const filter: Record<string, any> = { is_active: { $ne: false }, kind: { $ne: 'package' } };
    const text = (q || '').trim().slice(0, 100);
    if (text) {
      const re = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name_ar: re }, { name_en: re }];
    }
    if (category) filter.category = String(category);
    const min = parseFloat(minPrice || '');
    const max = parseFloat(maxPrice || '');
    if (Number.isFinite(min) || Number.isFinite(max)) {
      filter.price = {};
      if (Number.isFinite(min)) filter.price.$gte = min;
      if (Number.isFinite(max)) filter.price.$lte = max;
    }
    const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 200);

    const services: any[] = (await this.conn.db
      .collection(CATALOG_COLLECTIONS.nursing_services)
      .find(filter, { projection: { _id: 0 } })
      .limit(1000)
      .toArray());

    const latNum = parseFloat(lat || '');
    const lngNum = parseFloat(lng || '');
    let list: any[] = services;
    if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
      const nurses = await this.conn.db.collection('provider_profiles').find({
        type: { $in: ['home_care', 'nursing', 'nurse'] }, status: 'active', public_eligibility: true,
        medical_review_status: 'approved', 'geo.lat': { $ne: null }, 'geo.lng': { $ne: null },
      } as any, { projection: { _id: 0, account_id: 1, geo: 1, nursing_services: 1 } }).toArray();
      list = nearestFirst(services, nurses as any[], { lat: latNum, lng: lngNum },
        (svc, p: any) => (p.nursing_services || []).some((n: any) => n?.key === svc.id));
    }
    const skip = (pageNum - 1) * limitNum;
    return { data: list.slice(skip, skip + limitNum), page: pageNum, limit: limitNum, total: list.length };
  }

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
    // Every field HomeCareSvc.book reads is forwarded, so this alias behaves exactly like
    // POST /nursing/bookings (it dropped provider_id, which book() requires).
    const booking = await this.homeSvc.book(u, {
      service_id: body.service_id,
      scheduled_at: body.scheduled_at,
      notes: body.notes,
      payment_method: body.payment_method,
      provider_id: body.provider_id,
      contact: body.contact,
      sessions_count: body.sessions_count,
      ...(body.address ? { address: body.address } : body.address_id ? { address: { address_id: body.address_id } } : {}),
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
    return { data: await this.homeSvc.withServiceNames(merged), page: parseInt(page, 10) || 1, limit: lim };
  }
}
