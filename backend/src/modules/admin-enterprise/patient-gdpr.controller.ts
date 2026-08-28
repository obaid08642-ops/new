import { BadRequestException, Body, Controller, Get, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';

/**
 * A4 — patient-facing GDPR endpoints. These are what the mobile/web privacy
 * buttons call: request lifecycle + streaming their export package.
 * (Admin console drives the same gdpr_requests rows from the other side.)
 */
@Controller('privacy')
@UseGuards(JwtAuthGuard)
export class PatientGdprController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Get('requests')
  async myRequests(@CurrentUser() me: any) {
    const rows = await this.conn.collection('gdpr_requests')
      .find({ user_id: me.id })
      .sort({ createdAt: -1 }).limit(20)
      .project({ _id: 0, id: 1, type: 1, status: 1, createdAt: 1, completed_at: 1, result_ref: 1 })
      .toArray();
    return { data: rows };
  }

  /** Patient creates their own export/erasure request. */
  @Post('requests')
  async createRequest(@Body() b: any, @CurrentUser() me: any) {
    const type = String(b?.type || '');
    if (!['export', 'delete'].includes(type)) throw new BadRequestException('invalid_type');
    const open = await this.conn.collection('gdpr_requests').findOne({
      user_id: me.id, type, status: { $in: ['requested', 'processing'] },
    });
    if (open) return { ok: true, existing: true, id: (open as any).id, status: (open as any).status };

    const doc = {
      id: `gdpr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      user_id: me.id, type, status: 'requested',
      requested_by: `self:${me.id}`,
      result_ref: null, createdAt: new Date(), updatedAt: new Date(),
    };
    await this.conn.collection('gdpr_requests').insertOne(doc as any);
    const { _id, ...clean } = doc as any;
    return { ok: true, ...clean };
  }

  /** Download the materialized export package once completed by an admin. */
  @Post('exports/fetch')
  async fetchExport(@CurrentUser() me: any) {
    const req: any = await this.conn.collection('gdpr_requests').findOne(
      { user_id: me.id, type: 'export', status: 'completed' },
      { sort: { completed_at: -1 } },
    );
    if (!req?.result_ref) throw new NotFoundException('no_completed_export');
    const pkg = await this.conn.collection('gdpr_exports').findOne({ request_id: req.id });
    if (!pkg?.payload) throw new NotFoundException('export_package_missing');
    // Strip admin-internal fields before handing to the patient.
    const payload = JSON.parse(JSON.stringify(pkg.payload));
    delete payload.collections.user?.anonymized_at;
    return payload;
  }
}
