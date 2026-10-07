import { Injectable } from '@nestjs/common';
import { CampaignAttributionService, AttributedOrder } from './campaign-attribution.service';

export interface CampaignReportRow {
  campaign: string;
  source: string;
  medium: string;
  orders: number;
  revenue: number;
  conversion_rate: number;
}

export interface CampaignSummary {
  total_orders: number;
  total_revenue: number;
  overall_conversion_rate: number;
  by_campaign: CampaignReportRow[];
  by_source: { source: string; orders: number; revenue: number }[];
  by_medium: { medium: string; orders: number; revenue: number }[];
}

@Injectable()
export class CampaignReportService {
  constructor(private readonly attribution: CampaignAttributionService) {}

  /**
   * Generate full campaign attribution report
   */
  async generateReport(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }): Promise<CampaignSummary> {
    const orders = await this.attribution.getAttributedOrders(filters);

    if (orders.length === 0) {
      return {
        total_orders: 0,
        total_revenue: 0,
        overall_conversion_rate: 0,
        by_campaign: [],
        by_source: [],
        by_medium: [],
      };
    }

    // Group by campaign + source + medium
    const campaignMap = new Map<string, CampaignReportRow>();
    const sourceMap = new Map<string, { source: string; orders: number; revenue: number }>();
    const mediumMap = new Map<string, { medium: string; orders: number; revenue: number }>();

    for (const order of orders) {
      const utm = order.utm;
      const campaign = utm.utm_campaign || '(not set)';
      const source = utm.utm_source || '(not set)';
      const medium = utm.utm_medium || '(not set)';
      const key = `${campaign}|${source}|${medium}`;

      const existing = campaignMap.get(key) || {
        campaign,
        source,
        medium,
        orders: 0,
        revenue: 0,
        conversion_rate: 0,
      };
      existing.orders += 1;
      existing.revenue += order.total;
      campaignMap.set(key, existing);

      // Source aggregation
      const src = sourceMap.get(source) || { source, orders: 0, revenue: 0 };
      src.orders += 1;
      src.revenue += order.total;
      sourceMap.set(source, src);

      // Medium aggregation
      const med = mediumMap.get(medium) || { medium, orders: 0, revenue: 0 };
      med.orders += 1;
      med.revenue += order.total;
      mediumMap.set(medium, med);
    }

    const by_campaign = Array.from(campaignMap.values()).map((row) => ({
      ...row,
      revenue: Math.round(row.revenue * 100) / 100,
      conversion_rate: 0, // Would need sessions data for true conversion rate
    }));

    const total_orders = orders.length;
    const total_revenue = Math.round(orders.reduce((sum, o) => sum + o.total, 0) * 100) / 100;

    return {
      total_orders,
      total_revenue,
      overall_conversion_rate: 0, // Placeholder - requires session/visitor tracking
      by_campaign: by_campaign.sort((a, b) => b.revenue - a.revenue),
      by_source: Array.from(sourceMap.values()).sort((a, b) => b.revenue - a.revenue),
      by_medium: Array.from(mediumMap.values()).sort((a, b) => b.revenue - a.revenue),
    };
  }

  /**
   * Get orders for a specific campaign (for drill-down)
   */
  async getOrdersForCampaign(
    campaign: string,
    filters?: { dateFrom?: Date; dateTo?: Date; utm_source?: string; utm_medium?: string }
  ): Promise<AttributedOrder[]> {
    return this.attribution.getAttributedOrders({
      ...filters,
      utm_campaign: campaign,
    });
  }
}