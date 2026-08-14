// @ts-nocheck
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Medicine, MedicineDocument } from '../../schemas/medicine.schema';
import { EVENTS } from '../../common/events';
import { MedicineRepository } from "./repositories/medicine.repository";

@Injectable()
export class MedicinesService {
  constructor(
    @Inject('MedicineRepository') private model: MedicineRepository,
    private events: EventEmitter2,
  ) {}

  async list(search?: string, category?: string, includeUnverified = true) {
    const q: any = { is_deleted: { $ne: true } };
    if (search) q.$or = [
      { name_ar: { $regex: search, $options: 'i' } },
      { name_en: { $regex: search, $options: 'i' } },
      { active_ingredient: { $regex: search, $options: 'i' } },
    ];
    if (category) q.category = category;
    if (!includeUnverified) q.verified = true;
    return this.model.find(q, { _id: 0, __v: 0 }).sort({ verified: -1, usage_count: -1, name_ar: 1 }).limit(500);
  }

  /** Light autocomplete - id+name only for live suggestions */
  async autocomplete(query: string) {
    const q = (query || '').trim();
    if (q.length < 1) return [];
    const re = new RegExp(q, 'i');
    return this.model.find(
      { $or: [{ name_ar: re }, { name_en: re }, { active_ingredient: re }], is_deleted: { $ne: true } },
      { _id: 0, id: 1, name_ar: 1, name_en: 1, active_ingredient: 1, image: 1, price: 1, requires_prescription: 1, category: 1 }
    ).sort({ usage_count: -1 }).limit(10);
  }

  /**
   * Parse a raw barcode string. Handles plain GTINs as well as GS1 DataMatrix
   * payloads that interleave Application Identifiers (AIs) like:
   *   01<GTIN14>17<YYMMDD>10<BATCH><GS>21<SERIAL>
   * where <GS> is the ASCII Group Separator (\x1d).
   * Returns the best candidate code(s) to query against the catalog.
   */
  private extractCodes(raw: string): string[] {
    if (!raw) return [];
    const cleaned = raw.replace(/[\x00-\x1f\x7f]/g, '|'); // normalize control chars
    const out = new Set<string>();
    out.add(raw);
    out.add(cleaned);

    // GS1 DataMatrix: "01" + 14 digit GTIN is the most common AI prefix
    const gtinMatch = cleaned.match(/^01(\d{14})/);
    if (gtinMatch) {
      const gtin14 = gtinMatch[1];
      out.add(gtin14);
      // Drop the leading "0" to get a GTIN-13 / EAN-13
      if (gtin14.startsWith('0')) out.add(gtin14.substring(1));
    }

    // Sometimes scanners emit the GTIN with leading zeros stripped — also try padded
    if (/^\d{12,14}$/.test(raw)) {
      out.add(raw.padStart(14, '0'));
    }

    return Array.from(out);
  }

  /** Lookup medicine by exact barcode (EAN13/UPC/etc). Returns first match or null.
   *  Supports plain GTINs and GS1 DataMatrix payloads (with non-printable separators).
   */
  async byBarcode(code: string) {
    const c = (code || '').trim();
    if (!c) return { found: false, source: 'none', medicine: null };

    const candidates = this.extractCodes(c);

    // 1) Exact match in catalog (try all candidate codes)
    const doc = await this.model.findOne(
      { barcode: { $in: candidates }, is_deleted: { $ne: true } },
      { _id: 0, __v: 0 },
    ).lean();
    if (doc) return { found: true, source: 'catalog', medicine: doc, codes_tried: candidates };

    // 2) Fuzzy match on name / active_ingredient (in case scanner read a textual code)
    const fuzzy = await this.model.findOne(
      { $or: [{ name_en: { $regex: c, $options: 'i' } }, { active_ingredient: { $regex: c, $options: 'i' } }] },
      { _id: 0, __v: 0 },
    ).lean();
    if (fuzzy) return { found: true, source: 'fuzzy', medicine: fuzzy, codes_tried: candidates };

    return {
      found: false,
      source: 'none',
      medicine: null,
      codes_tried: candidates,
      // hint for the frontend: ask AI fallback
      ai_lookup_recommended: true,
    };
  }

  /** Category counts for category strip in Pharmacy tab */
  async categories() {
    const agg: any[] = await this.model.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { _id: 0, slug: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    return agg;
  }

  async filters() {
    const categories = await this.model.distinct('category', { is_deleted: { $ne: true } });
    const brands = await this.model.distinct('manufacturer', { is_deleted: { $ne: true }, manufacturer: { $ne: null } });
    const forms = await this.model.distinct('form', { is_deleted: { $ne: true }, form: { $ne: null } });

    return {
      categories: categories.filter(Boolean),
      brands: brands.filter(Boolean),
      forms: forms.length ? forms.filter(Boolean) : ['أقراص', 'كبسولات', 'شراب', 'حقن', 'كريم / مرهم', 'نقط'],
      sortOptions: ['الأكثر مبيعاً', 'السعر: من الأقل للأعلى', 'السعر: من الأعلى للأقل', 'الأحدث']
    };
  }

  async compare(ids: string[]) {
    if (!ids || !ids.length) return [];
    return this.model.find({ id: { $in: ids }, is_deleted: { $ne: true } }, { _id: 0, __v: 0 }).lean();
  }

  async getById(id: string) {
    const m = await this.model.findOne({ id, is_deleted: { $ne: true } }, { _id: 0, __v: 0 });
    if (!m) throw new NotFoundException();
    return m;
  }

  /**
   * Enriched details: medicine + alternatives + live stock aggregation + insurance coverage.
   * Single call to power the Medicine Detail screen.
   */
  async details(id: string) {
    const med = await this.getById(id);
    const [alts, stock] = await Promise.all([
      med.active_ingredient
        ? this.model.find(
            { active_ingredient: med.active_ingredient, id: { $ne: id } },
            { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, manufacturer: 1, requires_prescription: 1 },
          ).limit(8)
        : [],
      this.aggregateStock(id),
    ]);
    // Lazily refresh denormalized aggregates if stale
    if (stock.aggregate_stock !== (med as any).aggregate_stock || stock.pharmacies_count !== (med as any).pharmacies_count) {
      this.model.updateOne({ id }, { $set: { aggregate_stock: stock.aggregate_stock, pharmacies_count: stock.pharmacies_count } }).catch(() => {});
    }
    return {
      ...((med as any).toObject ? (med as any).toObject() : med),
      alternatives: alts,
      stock_status: stock,
    };
  }

  /** Aggregate stock across all pharmacies via the inventory collection. */
  async aggregateStock(medicine_id: string) {
    // We use a soft import to avoid coupling — query the inventory collection directly via the model connection.
    const conn: any = (this.model as any).db;
    const InvModel = conn.models?.PharmacyInventory || conn.model?.('PharmacyInventory');
    if (!InvModel) return { aggregate_stock: 0, pharmacies_count: 0, in_stock: false };
    const agg = await InvModel.aggregate([
      { $match: { medicine_id, is_available: true } },
      { $group: { _id: null, total: { $sum: '$stock_qty' }, n: { $sum: { $cond: [{ $gt: ['$stock_qty', 0] }, 1, 0] } } } },
    ]);
    const row = (agg && agg[0]) || { total: 0, n: 0 };
    return { aggregate_stock: row.total || 0, pharmacies_count: row.n || 0, in_stock: (row.total || 0) > 0 };
  }

  async alternatives(id: string) {
    const med = await this.getById(id);
    if (!med.active_ingredient) return [];
    return this.model.find(
      { active_ingredient: med.active_ingredient, id: { $ne: id }, is_deleted: { $ne: true } },
      { _id: 0, __v: 0 },
    ).limit(20);
  }

  // RULE: Manual entries from patient/doctor/pharmacy are operational immediately.
  // Admin async review later.
  async createManualEntry(data: Partial<Medicine>, byUserId: string, byRole: string) {
    const m = await this.model.create({
      ...data,
      verified: false,
      source: byRole,
      created_by_user_id: byUserId,
      created_by_role: byRole,
    });
    this.events.emit(EVENTS.MEDICINE_PENDING_REVIEW, { medicine_id: m.id, by_role: byRole });
    return m;
  }

  async approve(id: string, by: string) {
    const m = await this.model.findOneAndUpdate(
      { id },
      { $set: { verified: true, approved_by: by, approved_at: new Date() } },
      { new: true, projection: { _id: 0, __v: 0 } },
    );
    if (!m) throw new NotFoundException();
    this.events.emit(EVENTS.MEDICINE_APPROVED, { medicine_id: id, by });
    return m;
  }

  async reject(id: string, by: string, reason: string) {
    const m = await this.model.findOneAndUpdate(
      { id },
      { $set: { rejected_reason: reason, verified: false } },
      { new: true, projection: { _id: 0, __v: 0 } },
    );
    if (!m) throw new NotFoundException();
    this.events.emit(EVENTS.MEDICINE_REJECTED, { medicine_id: id, by, reason });
    return m;
  }

  async update(id: string, data: Partial<Medicine>) {
    return this.model.findOneAndUpdate({ id }, { $set: data }, { new: true, projection: { _id: 0, __v: 0 } });
  }

  async pendingReview() {
    return this.model.find({ verified: false, source: { $ne: 'master' } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
  }

  // ============ ADMIN CATALOG CRUD ============
  async createCatalog(data: any, byUserId: string) {
    const m = await this.model.create({
      ...data,
      verified: true,
      source: 'admin',
      created_by_user_id: byUserId,
      created_by_role: 'admin',
      approved_by: byUserId,
      approved_at: new Date()
    });
    this.events.emit(EVENTS.MEDICINE_APPROVED, { medicine_id: m.id, by: byUserId });
    return m;
  }

  async deleteCatalog(id: string) {
    const m = await this.model.findOneAndUpdate({ id }, { $set: { is_deleted: true } }, { new: true });
    if (!m) throw new NotFoundException();
    return { ok: true };
  }

  // ============ BULK IMPORT (CSV / JSON) ============
  /**
   * Bulk imports stay UNVERIFIED until admin approves them — they're operational
   * (returned in search) but flagged so the admin can validate.
   */
  async bulkImport(rows: any[], byUserId: string, byRole: string, autoApprove = false) {
    const created: any[] = [];
    const failed: any[] = [];
    for (const r of rows) {
      try {
        const name_ar = String(r.name_ar || r['name ar'] || r['اسم عربي'] || '').trim();
        if (!name_ar) { failed.push({ row: r, error: 'missing name_ar' }); continue; }
        const doc: any = {
          name_ar,
          name_en: String(r.name_en || r['name en'] || r['english name'] || '').trim() || undefined,
          active_ingredient: String(r.active_ingredient || r['active ingredient'] || r['المادة الفعالة'] || '').trim() || undefined,
          manufacturer: String(r.manufacturer || r['الشركة'] || '').trim() || undefined,
          category: String(r.category || 'medications').trim() || 'medications',
          price: Number(r.price ?? r['السعر'] ?? 0) || 0,
          description_ar: r.description_ar || undefined,
          description_en: r.description_en || undefined,
          requires_prescription: !!(r.requires_prescription === true || String(r.requires_prescription || '').toLowerCase() === 'true' || r['rx'] === '1'),
          image: r.image || undefined,
          source: 'bulk_import',
          created_by_user_id: byUserId,
          created_by_role: byRole,
          verified: !!autoApprove,
          approved_at: autoApprove ? new Date() : undefined,
          approved_by: autoApprove ? byUserId : undefined,
        };
        // Upsert by name_ar to avoid duplicates
        const m = await this.model.findOneAndUpdate(
          { name_ar: doc.name_ar },
          { $setOnInsert: doc },
          { upsert: true, new: true, projection: { _id: 0, __v: 0 } },
        );
        created.push(m);
        if (!autoApprove) this.events.emit(EVENTS.MEDICINE_PENDING_REVIEW, { medicine_id: m.id, by_role: byRole });
      } catch (e: any) {
        failed.push({ row: r, error: e.message });
      }
    }
    return { ok: true, imported: created.length, failed: failed.length, failed_rows: failed.slice(0, 20), needs_review: !autoApprove };
  }

  parseCsv(csv: string): any[] {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = this.splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const cells = this.splitCsvLine(line);
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
      return obj;
    });
  }
  private splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
      else { cur += c; }
    }
    out.push(cur);
    return out;
  }
}
