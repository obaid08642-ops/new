/**
 * Internal Analytics — admin dashboard metrics computed from REAL collections:
 *   search_queries, orders, appointments, pushengagements, chatmessages, users.
 * No external analytics service — everything stays in-house.
 */
import { BadRequestException, Module, Injectable, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

/**
 * P13-R10: ranking modes reportable here. Mirrors the storefront ranking
 * modes (see `modeScoreField` in product-ranking.service.ts on oc/P13-R9,
 * PR #1479 — consolidate on that helper once it reaches main).
 */
const RANKING_REPORT_MODES: Record<string, string> = {
  smart_ranking: 'composite_score',
  trending: 'trending_score',
  bestseller: 'purchases_count',
  most_viewed: 'views_count',
  most_searched: 'searches_count',
  most_added_to_cart: 'cart_adds_count',
  highest_conversion: 'conversion_rate',
  popular_recently: 'recent_score',
};

@Injectable()
export class AdminAnalyticsService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private col(name: string) { return this.conn.collection(name); }

  // ── Top searched terms (medicine search analytics) ─────────────
  async topSearched(limit = 20) {
    return this.col('search_queries').aggregate([
      { $group: { _id: '$term_lc', searches: { $sum: 1 }, avg_results: { $avg: '$results_count' }, last: { $max: '$createdAt' } } },
      { $sort: { searches: -1 } },
      { $limit: limit },
      { $project: { _id: 0, term: '$_id', searches: 1, avg_results: { $round: ['$avg_results', 1] }, last: 1 } },
    ]).toArray();
  }

  // ── Top ordered medicines ──────────────────────────────────────
  async topOrderedMedicines(limit = 20) {
    return this.col('orders').aggregate([
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
      { $group: { _id: { $ifNull: ['$items.name_ar', '$items.name'] }, orders: { $sum: 1 }, qty: { $sum: { $ifNull: ['$items.qty', 1] } }, revenue: { $sum: { $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.qty', 1] }] } } } },
      { $sort: { qty: -1 } },
      { $limit: limit },
      { $project: { _id: 0, medicine: '$_id', orders: 1, qty: 1, revenue: { $round: ['$revenue', 2] } } },
    ]).toArray();
  }

  // ── Top doctors (by completed+total appointments) ──────────────
  async topDoctors(limit = 20) {
    return this.col('appointments').aggregate([
      { $group: { _id: { $ifNull: ['$doctor_name', '$provider_id'] }, appointments: { $sum: 1 }, completed: { $sum: { $cond: [{ $in: ['$status', ['COMPLETED', 'complete', 'completed']] }, 1, 0] } } } },
      { $sort: { appointments: -1 } },
      { $limit: limit },
      { $project: { _id: 0, doctor: '$_id', appointments: 1, completed: 1 } },
    ]).toArray();
  }

  // ── Top pharmacies (by order volume) ───────────────────────────
  async topPharmacies(limit = 20) {
    return this.col('orders').aggregate([
      { $group: { _id: { $ifNull: ['$pharmacy_id', '$pharmacy_name'] }, orders: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$total', { $ifNull: ['$totals.total', 0] }] } } } },
      { $sort: { orders: -1 } },
      { $limit: limit },
      { $project: { _id: 0, pharmacy: '$_id', orders: 1, revenue: { $round: ['$revenue', 2] } } },
    ]).toArray();
  }

  // ── Top services used ──────────────────────────────────────────
  async topServices(limit = 20) {
    return this.col('search_queries').aggregate([
      { $group: { _id: { $ifNull: ['$type', '$service_type', 'consultation'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, service: '$_id', count: 1 } },
    ]).toArray();
  }

  // ── P17-17.5: campaign report — attributed orders per vertical ──────
  // Reads the `attribution` each order/booking create path stores, so the
  // report shows exactly what clients sent (collection names mirror the
  // guest-merge registry: pharmacy_orders, lab/radiology/home_care_bookings,
  // appointments).
  async campaignReport(campaign: string, days = 30, limit = 100) {
    const name = String(campaign || '').trim().slice(0, 120);
    if (!name) throw new BadRequestException('campaign_required');
    const safeDays = Math.min(365, Math.max(1, Number(days) || 30));
    const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100));
    const since = new Date(Date.now() - safeDays * 86400000);
    const verticals = [
      { vertical: 'pharmacy', collection: 'pharmacy_orders' },
      { vertical: 'lab', collection: 'lab_bookings' },
      { vertical: 'radiology', collection: 'radiology_bookings' },
      { vertical: 'nursing', collection: 'home_care_bookings' },
      { vertical: 'consultation', collection: 'appointments' },
    ];
    const byVertical: Record<string, number> = {};
    const rows: Array<{ vertical: string; id: string; total: number | null; status: string; created_at: Date }> = [];
    for (const v of verticals) {
      const docs: any[] = await this.col(v.collection)
        .find({ 'attribution.utm_campaign': name, createdAt: { $gte: since } }, { projection: { _id: 0, id: 1, total: 1, total_price: 1, status: 1, state: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .toArray()
        .catch(() => []);
      byVertical[v.vertical] = docs.length;
      for (const d of docs) {
        rows.push({
          vertical: v.vertical,
          id: String(d.id),
          total: Number(d.total ?? d.total_price ?? NaN),
          status: String(d.status ?? d.state ?? ''),
          created_at: d.createdAt,
        });
      }
    }
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      campaign: name,
      from: since,
      total: rows.length,
      by_vertical: byVertical,
      orders: rows.slice(0, safeLimit).map((r) => ({ ...r, total: Number.isFinite(r.total) ? r.total : null })),
    };
  }

  // ── P13-R10: ranking report per mode, pharmacy and category ─────────
  // Reads the same governed metrics the storefront ranks from, so the admin
  // sees exactly what the ranking API serves (no second counting path).
  async rankingTop(mode: string, pharmacyId?: string, category?: string, limit = 20) {
    const field = RANKING_REPORT_MODES[String(mode)];
    if (!field) {
      throw new BadRequestException('invalid_ranking_mode');
    }
    const match: any = {};
    if (pharmacyId) match.pharmacy_id = pharmacyId;
    if (category && category !== 'all') match.category = String(category).trim().toLowerCase();
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    return this.col('product_ranking_metrics').aggregate([
      { $match: match },
      { $sort: { [field]: -1 } },
      { $limit: safeLimit },
      {
        $project: {
          _id: 0, drug_id: 1, pharmacy_id: 1, category: 1,
          views_count: 1, searches_count: 1, cart_adds_count: 1,
          purchases_count: 1, conversion_rate: 1, composite_score: 1,
          trending_score: 1, recent_score: 1, availability_status: 1,
          last_event_at: 1, [field]: 1,
        },
      },
    ]).toArray();
  }

  // ── P13-R10: queries that returned nothing (catalogue / synonym gaps) ─
  async searchZeroResult(limit = 20, days = 7) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const since = new Date(Date.now() - Math.min(90, Math.max(1, Number(days) || 7)) * 86400000);
    return this.col('search_queries').aggregate([
      { $match: { createdAt: { $gte: since }, results_count: 0 } },
      { $group: { _id: '$term_lc', searches: { $sum: 1 }, last: { $max: '$createdAt' } } },
      { $sort: { searches: -1 } },
      { $limit: safeLimit },
      { $project: { _id: 0, term: '$_id', searches: 1, last: 1 } },
    ]).toArray();
  }

  // ── P13-R10: emerging terms (first seen inside the window, most searched)
  async searchEmerging(limit = 20, days = 7) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const since = new Date(Date.now() - Math.min(90, Math.max(1, Number(days) || 7)) * 86400000);
    return this.col('search_queries').aggregate([
      { $group: { _id: '$term_lc', searches: { $sum: 1 }, first_seen: { $min: '$createdAt' }, last: { $max: '$createdAt' } } },
      { $match: { first_seen: { $gte: since } } },
      { $sort: { searches: -1 } },
      { $limit: safeLimit },
      { $project: { _id: 0, term: '$_id', searches: 1, first_seen: 1, last: 1 } },
    ]).toArray();
  }

  // ── Overview: conversion, cancellation, actives, retention ─────
  async overview() {
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    const [users, orders, appointments, carts] = await Promise.all([
      this.col('users').countDocuments({}),
      this.col('orders').countDocuments({}),
      this.col('appointments').countDocuments({}),
      this.col('carts').countDocuments({}),
    ]);

    // Conversion: completed orders / created carts
    const completedOrders = await this.col('orders').countDocuments({ status: { $in: ['DELIVERED', 'COMPLETED', 'delivered', 'completed'] } });
    const cancelledOrders = await this.col('orders').countDocuments({ status: { $in: ['CANCELLED', 'cancelled'] } });
    const cancelledAppts = await this.col('appointments').countDocuments({ status: { $in: ['CANCELLED', 'cancelled', 'NO_SHOW'] } });

    // DAU/WAU/MAU — union of activity signals across collections
    const activitySince = async (ms: number) => {
      const res = await this.col('orders').aggregate([
        { $match: { createdAt: { $gte: new Date(now - ms) } } },
        { $group: { _id: '$patient_id' } },
        { $unionWith: { coll: 'appointments', pipeline: [{ $match: { createdAt: { $gte: new Date(now - ms) } } }, { $group: { _id: '$patient_id' } }] } },
        { $unionWith: { coll: 'pushengagements', pipeline: [{ $match: { createdAt: { $gte: new Date(now - ms) } } }, { $group: { _id: '$user_id' } }] } },
        { $unionWith: { coll: 'chatmessages', pipeline: [{ $match: { createdAt: { $gte: new Date(now - ms) } } }, { $group: { _id: '$sender_id' } }] } },
        { $group: { _id: null, users: { $addToSet: '$_id' } } },
      ]).toArray();
      return res[0]?.users?.filter(Boolean).length || 0;
    };
    const [dau, wau, mau] = await Promise.all([activitySince(day), activitySince(7 * day), activitySince(30 * day)]);

    // Retention (4-week): users active in ≥2 distinct weeks of last 4
    const retentionAgg = await this.col('orders').aggregate([
      { $match: { createdAt: { $gte: new Date(now - 28 * day) } } },
      { $group: { _id: { u: '$patient_id', week: { $week: '$createdAt' } } } },
      { $group: { _id: '$_id.u', weeks: { $sum: 1 } } },
      { $match: { weeks: { $gte: 2 } } },
      { $count: 'retained' },
    ]).toArray();
    const retained = retentionAgg[0]?.retained || 0;

    return {
      totals: { users, orders, appointments, carts },
      conversion_rate: carts > 0 ? +(completedOrders / carts * 100).toFixed(1) : null,
      order_cancellation_rate: orders > 0 ? +(cancelledOrders / orders * 100).toFixed(1) : null,
      appointment_cancellation_rate: appointments > 0 ? +(cancelledAppts / appointments * 100).toFixed(1) : null,
      active_users: { dau, wau, mau },
      retention_4w: { retained_users: retained, note: 'users with activity in ≥2 of last 4 weeks' },
    };
  }
}

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly svc: AdminAnalyticsService) {}

  @Get('overview')
  overview() { return this.svc.overview(); }

  @Get('top-searched')
  topSearched(@Query('limit') limit?: string) { return this.svc.topSearched(parseInt(limit || '20')); }

  @Get('top-medicines')
  topMedicines(@Query('limit') limit?: string) { return this.svc.topOrderedMedicines(parseInt(limit || '20')); }

  @Get('top-doctors')
  topDoctors(@Query('limit') limit?: string) { return this.svc.topDoctors(parseInt(limit || '20')); }

  @Get('top-pharmacies')
  topPharmacies(@Query('limit') limit?: string) { return this.svc.topPharmacies(parseInt(limit || '20')); }

  @Get('top-services')
  topServices(@Query('limit') limit?: string) { return this.svc.topServices(parseInt(limit || '20')); }

  // P13-R10: ranking report per mode/pharmacy/category + search gap reports.
  @Get('ranking/top')
  rankingTop(
    @Query('mode') mode?: string,
    @Query('pharmacy_id') pharmacyId?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.rankingTop(mode || '', pharmacyId, category, parseInt(limit || '20'));
  }

  @Get('search/zero-result')
  searchZeroResult(@Query('limit') limit?: string, @Query('days') days?: string) {
    return this.svc.searchZeroResult(parseInt(limit || '20'), parseInt(days || '7'));
  }

  @Get('search/emerging')
  searchEmerging(@Query('limit') limit?: string, @Query('days') days?: string) {
    return this.svc.searchEmerging(parseInt(limit || '20'), parseInt(days || '7'));
  }

  // P17-17.5: campaign-attributed orders across verticals.
  @Get('campaigns')
  campaigns(@Query('campaign') campaign?: string, @Query('days') days?: string, @Query('limit') limit?: string) {
    return this.svc.campaignReport(campaign || '', parseInt(days || '30'), parseInt(limit || '100'));
  }
}

@Module({
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
})
export class AnalyticsModule {}
