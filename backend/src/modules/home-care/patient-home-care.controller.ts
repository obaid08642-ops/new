import { Controller, Get, Post, Body, Query, ForbiddenException, BadRequestException, UseGuards, Param } from '@nestjs/common';
import { Public } from '../../common/auth.guard';
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

  // #645: Search and filters for nursing services
  @Get('services/search')
  async searchServices(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('home_visit') homeVisit?: string,
    @Query('min_price') minPrice?: string,
    @Query('max_price') maxPrice?: string,
    @Query('rating') rating?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius_km') radiusKm?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string
  ) {
    const q = { is_active: { $ne: false }, kind: { $ne: 'package' } } as any;
    if (q) {
      const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      (q as any).$or = [{ name_ar: re }, { name_en: re }, { short_code: re }];
    }
    if (category) (q as any).category = category;
    if (homeVisit === '1' || homeVisit === 'true') (q as any).home_visit_supported = true;
    if (minPrice || maxPrice) {
      (q as any).price = {};
      if (minPrice) (q as any).price.$gte = parseFloat(minPrice);
      if (maxPrice) (q as any).price.$lte = parseFloat(maxPrice);
    }
    if (rating) (q as any).rating_avg = { $gte: parseFloat(rating) };

    // #645: nearest filter with geo
    let sortObj: any = { popularity: -1, name_ar: 1 };
    let services = await this.conn.db
      .collection(CATALOG_COLLECTIONS.nursing_services)
      .find(q)
      .limit(parseInt(limit || '50'))
      .toArray();

    // #645: nearest filter with geo
    if (lat && lng) {
      const userLoc = { lat: parseFloat(lat), lng: parseFloat(lng) };
      const providers = await this.conn.db
        .collection('provider_profiles')
        .find({
          type: { $in: ['nurse', 'nursing', 'home_care'] },
          status: 'active',
          public_eligibility: true,
          medical_review_status: 'approved',
          'geo.lat': { $exists: true, $ne: null },
          'geo.lng': { $exists: true, $ne: null }
        }, { projection: { _id: 0, account_id: 1, geo: 1, delivery_zones: 1 } })
        .toArray();
      
      const providerDistances = new Map<string, number>();
      for (const p of providers) {
        if (p.geo && typeof p.geo.lat === 'number' && typeof p.geo.lng === 'number') {
          const dist = Math.sqrt(
            Math.pow(p.geo.lat - parseFloat(lat), 2) + Math.pow(p.geo.lng - parseFloat(lng), 2)
          ) * 111; // rough km conversion
          // Check delivery zones if available
          let inZone = true;
          if (p.delivery_zones) {
            inZone = p.delivery_zones.some((zone: any) => {
              if (zone.shape === 'circle' && zone.center) {
                const dist = Math.sqrt(
                  Math.pow(zone.center.lat - parseFloat(lat), 2) + Math.pow(zone.center.lng - parseFloat(lng), 2)
                ) * 111;
                return dist <= (zone.radius_km || 0);
              }
              return true;
            });
          }
          if (inZone) {
            providerDistances.set(p.account_id, dist);
          }
        }
      }
      
      // Enrich services with nearest provider distance
      const providerDistances = new Map<string, number>();
      const providers = await this.conn.db
        .collection('provider_profiles')
        .find({
          type: { $in: ['nurse', 'nursing', 'home_care'] },
          status: 'active',
          public_eligibility: true,
          medical_review_status: 'approved',
          'geo.lat': { $exists: true, $ne: null },
          'geo.lng': { $exists: true, $ne: null }
        }, { projection: { _id: 0, account_id: 1, geo: 1, delivery_zones: 1 } })
        .toArray();
      
      const providerDistances = new Map<string, number>();
      for (const p of providers) {
        if (p.geo && typeof p.geo.lat === 'number' && typeof p.geo.lng === 'number') {
          const dist = Math.sqrt(
            Math.pow(p.geo.lat - parseFloat(lat), 2) + Math.pow(p.geo.lng - parseFloat(lng), 2)
          ) * 111;
          let inZone = true;
          if (p.delivery_zones) {
            inZone = p.delivery_zones.some((zone: any) => {
              if (zone.shape === 'circle' && zone.center) {
                const dist = Math.sqrt(
                  Math.pow(zone.center.lat - parseFloat(lat), 2) + Math.pow(zone.center.lng - parseFloat(lng), 2)
                ) * 111;
                return dist <= (zone.radius_km || 0);
              }
              return true;
            });
          }
          if (inZone) {
            providerDistances.set(p.account_id, dist);
          }
        }
      
      // Enrich services with nearest provider distance
      const servicesWithDistance = services.map((svc: any) => {
        let minDist = Number.POSITIVE_INFINITY;
        const providerIds = svc.compatible_providers || [];
        for (const pid of providerIds) {
          const dist = providerDistances.get(pid);
          if (dist !== undefined && dist < minDist) minDist = dist;
        }
        return { ...svc, nearest_provider_km: minDist === Number.POSITIVE_INFINITY ? null : Math.round(minDist * 10) / 10 };
      });
      
      servicesWithDistance.sort((a, b) => (a.nearest_provider_km ?? Number.POSITIVE_INFINITY) - (b.nearest_provider_km ?? Number.POSITIVE_INFINITY));
      return { data: servicesWithDistance.slice(0, parseInt(limit || '50')) };
    }
    
    // Apply pagination
    const page = Math.max(parseInt(page || '1'), 1);
    const limit = Math.min(parseInt(limit || '50'), 200);
    const skip = (page - 1) * limit;
    const paginated = services.slice(skip, skip + limit);
    return { data: paginated, page: parseInt(page || '1'), limit: parseInt(limit || '50') };
  }

  // #647: Live tracking for nursing visits
  @Get('bookings/:id/tracking')
  async getTracking(@CurrentUser() u: any, @Param('id') id: string) {
    const userId = uid(u);
    if (!userId) throw new ForbiddenException('authenticated_user_required');
    
    const booking = await this.conn.db
      .collection('home_care_bookings')
      .findOne({ id, patient_id: userId } as any);
    if (!booking) throw new NotFoundException('booking_not_found');
    
    // Return tracking info based on booking state
    return {
      booking_id: id,
      state: booking.state,
      provider: booking.provider_id ? {
        id: booking.provider_id,
        name: booking.provider_name || null,
        phone: booking.provider_phone || null,
        gps_lat: booking.gps_lat || null,
        gps_lng: booking.gps_lng || null,
        last_location_update: booking.gps_updated_at || null
      } : null,
      timeline: booking.timeline || [],
      estimated_arrival: booking.estimated_arrival || null,
      current_step: this.getCurrentStep(booking.state),
      steps: ['CONFIRMED', 'PROVIDER_ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED']
    };
  }

  private getCurrentStep(state: string): number {
    const steps = ['CONFIRMED', 'PROVIDER_ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];
    const idx = steps.indexOf(state);
    return idx >= 0 ? idx : 0;
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
