/**
 * Internal Analytics — admin dashboard metrics computed from REAL collections:
 *   search_queries, orders, appointments, pushengagements, chatmessages, users.
 * No external analytics service — everything stays in-house.
 */
import { Module, Injectable, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

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
    return this.col('appointments').aggregate([
      { $group: { _id: { $ifNull: ['$type', '$service_type', 'consultation'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, service: '$_id', count: 1 } },
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
}

@Module({
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
})
export class AnalyticsModule {}
