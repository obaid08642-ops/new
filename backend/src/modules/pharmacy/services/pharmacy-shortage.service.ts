/**
 * Phase 8: Drug shortage flag system & Shortage Detection Engine.
 * Rules A (5 consecutive rejections) and B (10 rejections in 7 days) automatic triggers.
 * Includes shortage monitoring dashboard analytics for admins.
 */
import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { DrugShortageFlag, PharmacyOrder } from '../schemas/pharmacy.schema';
import { DrugRejectionLog } from '../../../schemas/drug-rejection-log.schema';
import { Medicine } from '../../../schemas/medicine.schema';
import { DrugShortageFlagRepository } from "./repositories/drugshortageflag.repository";
import { DrugRejectionLogRepository } from "./repositories/drugrejectionlog.repository";
import { MedicineRepository } from "./repositories/medicine.repository";
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";

@Injectable()
export class PharmacyShortageService {
  constructor(
    @Inject('DrugShortageFlagRepository') private flags: DrugShortageFlagRepository,
    @Inject('DrugRejectionLogRepository') private rejections: DrugRejectionLogRepository,
    @Inject('MedicineRepository') private medicines: MedicineRepository,
    @Inject('PharmacyOrderRepository') private orders: PharmacyOrderRepository,
  ) {}

  private toObj(doc: any) {
    return doc && doc.toObject ? doc.toObject() : doc;
  }

  async reportByPharmacy(user: any, body: { sku?: string; generic_name?: string; name_ar?: string; dosage?: string; form?: string; reason?: string }): Promise<any> {
    if (user?.role !== 'provider') throw new ForbiddenException();
    const flag = await this.flags.create({
      id: uuidv4(),
      sku: body.sku, generic_name: body.generic_name, name_ar: body.name_ar, dosage: body.dosage, form: body.form,
      source: 'pharmacy', reported_by_pharmacy_account_id: user.id,
      status: 'pending', reason: body.reason,
    });
    return this.toObj(flag);
  }

  async createByAdmin(user: any, body: { sku?: string; generic_name?: string; name_ar?: string; dosage?: string; form?: string; reason?: string }): Promise<any> {
    if (user?.role !== 'admin') throw new ForbiddenException();
    const flag = await this.flags.create({
      id: uuidv4(),
      sku: body.sku, generic_name: body.generic_name, name_ar: body.name_ar, dosage: body.dosage, form: body.form,
      source: 'admin', status: 'approved', reason: body.reason, approved_by: user.id, approved_at: new Date(),
    });
    
    // If flagged by admin, update medicine availability status to admin_flagged_shortage
    if (body.sku) {
      await this.medicines.updateOne(
        { barcode: body.sku },
        { availability_status: 'admin_flagged_shortage', shortage_notes: body.reason }
      );
    }
    
    return this.toObj(flag);
  }

  async approve(user: any, id: string): Promise<any> {
    if (user?.role !== 'admin') throw new ForbiddenException();
    const f = await this.flags.findOneAndUpdate({ id, status: 'pending' }, { $set: { status: 'approved', approved_by: user.id, approved_at: new Date() } }, { new: true });
    if (!f) throw new NotFoundException();
    
    if (f.sku) {
      await this.medicines.updateOne(
        { barcode: f.sku },
        { availability_status: 'availability_may_be_limited', shortage_notes: f.reason }
      );
    }
    
    return this.toObj(f);
  }

  async reject(user: any, id: string, reason?: string): Promise<any> {
    if (user?.role !== 'admin') throw new ForbiddenException();
    const f = await this.flags.findOneAndUpdate({ id, status: 'pending' }, { $set: { status: 'rejected', reason } }, { new: true });
    if (!f) throw new NotFoundException();
    return this.toObj(f);
  }

  async resolve(user: any, id: string): Promise<any> {
    if (user?.role !== 'admin') throw new ForbiddenException();
    const f = await this.flags.findOneAndUpdate({ id, status: 'approved' }, { $set: { status: 'resolved', resolved_at: new Date() } }, { new: true });
    if (!f) throw new NotFoundException();
    
    if (f.sku) {
      await this.medicines.updateOne(
        { barcode: f.sku },
        { availability_status: 'none', shortage_notes: '' }
      );
    }
    
    return this.toObj(f);
  }

  async list(user: any, status?: string): Promise<any> {
    const q: any = {};
    if (status) q.status = status;
    if (user?.role === 'provider') q.$or = [{ source: 'admin', status: 'approved' }, { reported_by_pharmacy_account_id: user.id }];
    return this.flags.find(q).sort({ createdAt: -1 }).limit(200).lean();
  }

  /** Patient-facing: lookup shortage */
  async lookupForPatient(sku?: string, generic_name?: string): Promise<any> {
    const q: any = {};
    if (sku) q.barcode = sku;
    else if (generic_name) q.active_ingredient = { $regex: new RegExp(generic_name, 'i') };
    else return null;
    
    const med = await this.medicines.findOne(q).lean();
    if (med && med.availability_status && med.availability_status !== 'none') {
      return {
        availability_status: med.availability_status,
        shortage_notes: med.shortage_notes || '',
        message_en: 'Availability may be limited in some areas',
        message_ar: 'قد يكون غير متوفر حالياً في بعض المناطق',
      };
    }
    return null;
  }

  // ==========================================
  // PHASE 8: SHORTAGE AUTOMATIC ENGINE RULES
  // ==========================================

  async logRejection(medicineId: string, orderId: string, pharmacyId: string): Promise<void> {
    await this.rejections.create({
      id: uuidv4(),
      medicine_id: medicineId,
      order_id: orderId,
      pharmacy_id: pharmacyId,
      type: 'reject',
      timestamp: new Date()
    });

    // Check Trigger A: 5 consecutive rejections
    const last5 = await this.rejections.find({ medicine_id: medicineId }).sort({ timestamp: -1 }).limit(5).lean();
    if (last5.length === 5 && last5.every(log => log.type === 'reject')) {
      await this.medicines.updateOne({ id: medicineId }, { availability_status: 'availability_may_be_limited' });
      return;
    }

    // Check Trigger B: 10 rejections in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const rejectionCount = await this.rejections.countDocuments({
      medicine_id: medicineId,
      type: 'reject',
      timestamp: { $gte: sevenDaysAgo }
    });
    if (rejectionCount >= 10) {
      await this.medicines.updateOne({ id: medicineId }, { availability_status: 'availability_may_be_limited' });
    }
  }

  async logAcceptance(medicineId: string, orderId: string, pharmacyId: string): Promise<void> {
    await this.rejections.create({
      id: uuidv4(),
      medicine_id: medicineId,
      order_id: orderId,
      pharmacy_id: pharmacyId,
      type: 'accept',
      timestamp: new Date()
    });

    // Reset status back to 'none' if it was auto-triggered ('availability_may_be_limited')
    // Do NOT touch it if manually flagged by admin ('admin_flagged_shortage')
    const med = await this.medicines.findOne({ id: medicineId });
    if (med && med.availability_status === 'availability_may_be_limited') {
      await this.medicines.updateOne({ id: medicineId }, { availability_status: 'none' });
    }
  }

  async adminMarkShortage(user: any, medicineId: string, body: { status: 'none' | 'availability_may_be_limited' | 'admin_flagged_shortage'; notes?: string }): Promise<any> {
    if (user?.role !== 'admin') throw new ForbiddenException('Admin role required');
    const med = await this.medicines.findOneAndUpdate(
      { id: medicineId },
      { availability_status: body.status, shortage_notes: body.notes || '' },
      { new: true }
    );
    if (!med) throw new NotFoundException('Medicine not found');
    return this.toObj(med);
  }

  // ==========================================
  // PHASE 8: SHORTAGE DASHBOARD
  // ==========================================

  async getShortageDashboard(user: any): Promise<any> {
    if (user?.role !== 'admin') throw new ForbiddenException('Admin role required');

    // 1. Most rejected medicines
    const aggregateRejections = await this.rejections.aggregate([
      { $match: { type: 'reject' } },
      { $group: { _id: '$medicine_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const most_rejected = [];
    for (const item of aggregateRejections) {
      const med = await this.medicines.findOne({ id: item._id }).lean();
      if (med) {
        most_rejected.push({
          medicine_id: item._id,
          name_ar: med.name_ar,
          name_en: med.name_en || '',
          barcode: med.barcode || '',
          rejection_count: item.count,
          availability_status: med.availability_status
        });
      }
    }

    // 2. Cancellation counts (orders containing rejected medicines that ended up cancelled)
    const cancelledOrders = await this.orders.find({ status: 'cancelled' }).lean();
    const cancellationMap: Record<string, number> = {};
    for (const order of cancelledOrders) {
      for (const item of order.items) {
        // Find if this item has rejections
        const med = await this.medicines.findOne({ $or: [{ barcode: item.matched_sku }, { name_ar: item.raw_name }] });
        if (med) {
          cancellationMap[med.id] = (cancellationMap[med.id] || 0) + 1;
        }
      }
    }

    const cancellation_counts = Object.keys(cancellationMap).map(medId => ({
      medicine_id: medId,
      cancelled_orders_count: cancellationMap[medId]
    }));

    // 3. Shortage trends (rejections aggregated by day over last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const trends = await this.rejections.aggregate([
      { $match: { type: 'reject', timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          rejections: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      most_rejected,
      cancellation_counts,
      shortage_trends: trends.map(t => ({ date: t._id, count: t.rejections }))
    };
  }
}
