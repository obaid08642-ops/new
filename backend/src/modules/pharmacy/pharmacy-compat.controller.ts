import { Controller, Get, Post, Body, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { ReportShortageDto } from '../compat/compat.dto';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';

const now = () => new Date();

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('pharmacy')
@Roles(UserRole.PHARMACY, UserRole.ADMIN)
export class PharmacyCompatController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('products')
  async products(@CurrentUser() user: any, @Query('q') q?: string) {
    const u = uid(user);
    const rows = await this.conn.collection('pharmacy_inventory')
      .find({ $or: [{ pharmacy_id: u }, { account_id: u }, { provider_account_id: u }] } as any)
      .limit(500).toArray();
    const medIds = rows.map((r: any) => r.medicine_id).filter(Boolean);
    const meds = medIds.length
      ? await this.conn.collection(CATALOG_COLLECTIONS.medicines).find({ id: { $in: medIds } } as any).toArray()
      : [];
    const byId = new Map(meds.map((m: any) => [m.id, m]));
    let items = rows.map((r: any) => {
      const m: any = byId.get(r.medicine_id) || {};
      return {
        id: r.id || String(r._id), medicine_id: r.medicine_id,
        name: m.name_ar || m.name_en || r.name || '',
        price: r.price ?? m.price ?? 0, stock: r.stock ?? r.quantity ?? 0,
        shortage_flagged: !!r.shortage_flagged, active: r.active !== false,
      };
    });
    if (q?.trim()) {
      const needle = q.trim().toLowerCase();
      items = items.filter((i: any) => String(i.name).toLowerCase().includes(needle));
    }
    return items;
  }

  @Post('shortages/report')
  async reportShortage(@CurrentUser() user: any, @Body() body: ReportShortageDto) {
    const u = uid(user);
    const name = String(body?.product_name || '').trim();
    if (!name && !body?.medicine_id) throw new BadRequestException('اسم الصنف مطلوب');
    // Phase-6 workflow: a provider report NEVER shows the public badge by itself —
    // the report waits 'pending' until an admin approves it in the medicines module.
    const reportId = `shr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ins = await this.conn.collection('pharmacy_shortage_reports').insertOne({
      id: reportId,
      pharmacy_id: u, reporter_id: u, reporter_role: 'pharmacy',
      medicine_id: body?.medicine_id || null, medicine_name: name || null, product_name: name || null,
      note: body?.note || null, status: 'pending', createdAt: now(), updatedAt: now(),
    } as any);
    // Local stock hint only (pharmacy's own shelf view) — NOT the public badge
    if (body?.medicine_id) {
      await this.conn.collection('pharmacy_inventory').updateMany(
        { pharmacy_id: u, medicine_id: body.medicine_id } as any,
        { $set: { shortage_flagged: true } },
      );
    }
    // Notify admins about the new pending report
    await this.conn.collection('notifications').insertOne({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role: 'admin', title_key: 'بلاغ نقص دواء جديد',
      body_key: `بلاغ نقص من صيدلية: ${name || body?.medicine_id}`,
      type: 'alert', priority: 'high', is_read: false,
      data: { screen: '/admin/shortage-reports', report_id: reportId, medicine_id: body?.medicine_id || null },
      createdAt: now(), updatedAt: now(),
    } as any);
    return { ok: true, id: reportId, status: 'pending' };
  }
}
