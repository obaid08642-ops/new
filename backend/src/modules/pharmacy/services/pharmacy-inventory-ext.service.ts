import { Injectable, ForbiddenException, NotFoundException, Inject, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CATALOGUE_PROJECTION, catalogueFilter, catalogueSearchRow, catalogueSku } from './catalogue-lines';
import { escapeRegex } from '../../../common/slug.util';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PharmacyInventoryItem } from '../../provider/schemas/capabilities.schema';
import { PharmacyLowStockAlert } from '../schemas/pharmacy.schema';
import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { PharmacyLowStockAlertRepository } from "./repositories/pharmacylowstockalert.repository";
import { isProviderRole } from '../../../common/enums';

function assertProvider(u: any) { if (!u || !isProviderRole(u.role)) throw new ForbiddenException('provider_scope_required'); }

@Injectable()
export class PharmacyInventoryExtService {
  constructor(
    @Inject('PharmacyInventoryItemRepository') private inv: PharmacyInventoryItemRepository,
    @Inject('PharmacyLowStockAlertRepository') private alerts: PharmacyLowStockAlertRepository,
    @Optional() @InjectConnection() private readonly connection?: Connection,
  ) {}

  async search(user: any, q?: string, barcode?: string, includeCatalogue = false) {
    assertProvider(user);
    // query values are strings; anything else (barcode[$ne]=...) never reaches the filter
    q = typeof q === 'string' ? q : undefined;
    barcode = typeof barcode === 'string' ? barcode : undefined;
    const filter: any = { provider_account_id: user.id };
    if (barcode) filter.barcode = barcode;
    if (q && q.length >= 2) {
      filter.$or = [
        { name_ar: { $regex: escapeRegex(String(q)), $options: 'i' } },
        { name_en: { $regex: escapeRegex(String(q)), $options: 'i' } },
        { sku: { $regex: escapeRegex(String(q)), $options: 'i' } },
        { generic_name: { $regex: escapeRegex(String(q)), $options: 'i' } },
      ];
    }
    const own: any[] = await this.inv.find(filter, { _id: 0, __v: 0 }).sort({ name_ar: 1 }).limit(50).lean();
    // provider-journeys 1: the national catalogue items that match and are not in this pharmacy's inventory yet; the
    // pharmacy can price an order line from one (the offer then adds it to its inventory).
    const cf = includeCatalogue && this.connection ? catalogueFilter(q, barcode) : null;
    if (!cf) return own.map((row) => ({ ...row, source: 'inventory' }));
    const owned = new Set(own.map((row) => String(row.sku)));
    const medicines: any[] = await this.connection!.collection('medicines').find(cf, { projection: CATALOGUE_PROJECTION }).limit(30).toArray();
    const catalogue = medicines.filter((m) => !owned.has(catalogueSku(m))).slice(0, 20).map(catalogueSearchRow);
    return [...own.map((row) => ({ ...row, source: 'inventory' })), ...catalogue];
  }

  async restock(user: any, id: string, qty: number) {
    assertProvider(user);
    if (!qty || qty <= 0) throw new ForbiddenException('positive_qty_required');
    const updated = await this.inv.findOneAndUpdate(
      { id, provider_account_id: user.id },
      { $inc: { stock: qty }, $set: { last_restocked_at: new Date() } },
      { new: true },
    );
    if (!updated) throw new NotFoundException('inventory_not_found');
    // Auto-resolve any open alerts for this item
    if (updated.min_stock_alert <= 0 || updated.stock > updated.min_stock_alert) {
      await this.alerts.updateMany({ inventory_item_id: id, status: 'open' }, { $set: { status: 'restocked', resolved_at: new Date() } });
    }
    return updated.toObject();
  }

  async listLowStockAlerts(user: any) {
    assertProvider(user);
    // First compute live alerts based on current inventory
    await this.refreshAlerts(user.id);
    return this.alerts.find({ pharmacy_account_id: user.id, status: { $in: ['open', 'acknowledged'] } }, { _id: 0, __v: 0 }).sort({ raised_at: -1 }).lean();
  }

  async acknowledgeAlert(user: any, id: string) {
    assertProvider(user);
    const a = await this.alerts.findOneAndUpdate(
      { id, pharmacy_account_id: user.id, status: 'open' },
      { $set: { status: 'acknowledged' } },
      { new: true },
    );
    if (!a) throw new NotFoundException();
    return a.toObject();
  }

  private async refreshAlerts(pharmacyId: string) {
    const at = await this.inv.find({ provider_account_id: pharmacyId, min_stock_alert: { $gt: 0 } }).lean();
    for (const item of at) {
      if (item.stock <= (item.min_stock_alert || 0)) {
        const existing = await this.alerts.findOne({ pharmacy_account_id: pharmacyId, inventory_item_id: item.id, status: { $in: ['open', 'acknowledged'] } });
        if (!existing) {
          await this.alerts.create({
            id: uuidv4(),
            pharmacy_account_id: pharmacyId,
            inventory_item_id: item.id,
            sku: item.sku,
            name: item.name_ar || item.name_en || item.sku,
            current_stock: item.stock,
            threshold: item.min_stock_alert || 0,
            status: 'open',
            raised_at: new Date(),
          });
        } else if (existing.current_stock !== item.stock) {
          existing.current_stock = item.stock;
          await existing.save();
        }
      }
    }
  }
}
