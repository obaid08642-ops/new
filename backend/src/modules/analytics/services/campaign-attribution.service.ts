import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  msclid?: string;
  referrer?: string;
  landing_page?: string;
  timestamp?: string;
}

export interface AttributedOrder {
  order_id: string;
  patient_id: string;
  total: number;
  status: string;
  createdAt: Date;
  utm: UtmData;
}

@Injectable()
export class CampaignAttributionService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get orders() {
    return this.conn.collection('orders');
  }

  private get pharmacyOrders() {
    return this.conn.collection('pharmacy_orders');
  }

  /**
   * Attach UTM data to an order during creation
   */
  async attachUtmToOrder(orderId: string, utmData: UtmData): Promise<void> {
    const update = {
      $set: {
        'utm.utm_source': utmData.utm_source,
        'utm.utm_medium': utmData.utm_medium,
        'utm.utm_campaign': utmData.utm_campaign,
        'utm.utm_term': utmData.utm_term,
        'utm.utm_content': utmData.utm_content,
        'utm.gclid': utmData.gclid,
        'utm.fbclid': utmData.fbclid,
        'utm.msclid': utmData.msclid,
        'utm.referrer': utmData.referrer,
        'utm.landing_page': utmData.landing_page,
        'utm.captured_at': utmData.timestamp || new Date().toISOString(),
      },
    };

    await this.orders.updateOne({ id: orderId }, update);
    await this.pharmacyOrders.updateOne({ id: orderId }, update);
  }

  /**
   * Get all orders with UTM data for reporting
   */
  async getAttributedOrders(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }): Promise<AttributedOrder[]> {
    const match: any = {
      'utm.utm_source': { $exists: true, $ne: null },
    };

    if (filters?.dateFrom || filters?.dateTo) {
      match.createdAt = {};
      if (filters.dateFrom) match.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) match.createdAt.$lte = filters.dateTo;
    }
    if (filters?.utm_source) match['utm.utm_source'] = filters.utm_source;
    if (filters?.utm_medium) match['utm.utm_medium'] = filters.utm_medium;
    if (filters?.utm_campaign) match['utm.utm_campaign'] = filters.utm_campaign;

    const [legacyOrders, pharmacyOrders] = await Promise.all([
      this.orders.find(match, { projection: { _id: 0, __v: 0 } }).toArray(),
      this.pharmacyOrders.find(match, { projection: { _id: 0, __v: 0 } }).toArray(),
    ]);

    const normalize = (order: any): AttributedOrder => ({
      order_id: order.id,
      patient_id: order.patient_id || order.patient_account_id,
      total: Number(order.total || order.totals?.total || 0),
      status: order.state || order.status || order.effective_status || 'unknown',
      createdAt: order.createdAt || order.timeline?.[0]?.ts || new Date(),
      utm: order.utm || {},
    });

    return [...legacyOrders.map(normalize), ...pharmacyOrders.map(normalize)];
  }

  /**
   * Get unique UTM sources for filter dropdowns
   */
  async getUniqueUtmSources(): Promise<string[]> {
    const [legacy, pharmacy] = await Promise.all([
      this.orders.distinct('utm.utm_source', { 'utm.utm_source': { $exists: true, $ne: null } }),
      this.pharmacyOrders.distinct('utm.utm_source', { 'utm.utm_source': { $exists: true, $ne: null } }),
    ]);
    return [...new Set([...legacy, ...pharmacy])].filter(Boolean);
  }

  /**
   * Get unique UTM mediums for filter dropdowns
   */
  async getUniqueUtmMediums(): Promise<string[]> {
    const [legacy, pharmacy] = await Promise.all([
      this.orders.distinct('utm.utm_medium', { 'utm.utm_medium': { $exists: true, $ne: null } }),
      this.pharmacyOrders.distinct('utm.utm_medium', { 'utm.utm_medium': { $exists: true, $ne: null } }),
    ]);
    return [...new Set([...legacy, ...pharmacy])].filter(Boolean);
  }

  /**
   * Get unique UTM campaigns for filter dropdowns
   */
  async getUniqueUtmCampaigns(): Promise<string[]> {
    const [legacy, pharmacy] = await Promise.all([
      this.orders.distinct('utm.utm_campaign', { 'utm.utm_campaign': { $exists: true, $ne: null } }),
      this.pharmacyOrders.distinct('utm.utm_campaign', { 'utm.utm_campaign': { $exists: true, $ne: null } }),
    ]);
    return [...new Set([...legacy, ...pharmacy])].filter(Boolean);
  }
}