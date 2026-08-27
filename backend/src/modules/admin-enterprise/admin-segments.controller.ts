import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { validateReason, ReasonError } from '../../common/rbac';
import { AdminAuditService } from './audit.service';
import { compileSegment, SEGMENT_ALLOWED_FIELDS, SegmentDefinition } from './segments.engine';

/**
 * Segments builder — dynamic audiences used by campaigns & notifications.
 * The stored definition is compiled server-side at read time; counts and
 * member listings are REAL queries against users.
 */
@Controller('admin/segments')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminSegmentsController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('fields')
  @RequirePermissions(Permission.CRM_READ)
  fields() {
    return { allowed_fields: SEGMENT_ALLOWED_FIELDS };
  }

  @Get()
  @RequirePermissions(Permission.CRM_READ)
  async list() {
    const docs = await this.conn.collection('segments').find({}).sort({ updatedAt: -1 }).limit(200).toArray();
    const out = [];
    for (const d of docs as any[]) {
      const { _id, ...clean } = d;
      try {
        clean.count_current = await this.conn.collection('users').countDocuments(compileSegment(d.definition));
      } catch {
        clean.count_current = null; // definition no longer compiles (schema drift)
      }
      out.push(clean);
    }
    return out;
  }

  @Post('preview')
  @RequirePermissions(Permission.CRM_READ)
  async preview(@Body() b: any) {
    let filter: Record<string, any>;
    try {
      filter = compileSegment(b?.definition as SegmentDefinition);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'invalid_segment');
    }
    const [count, sample] = await Promise.all([
      this.conn.collection('users').countDocuments(filter),
      this.conn.collection('users').find(filter).limit(10)
        .project({ _id: 0, id: 1, full_name: 1, phone: 1, city: 1 })
        .toArray(),
    ]);
    return { count, sample, compiled_filter: filter };
  }

  @Post()
  async create(@Body() b: any, @CurrentUser() me: any) {
    let reason: string;
    try { reason = validateReason(b?.reason); } catch (e) { if (e instanceof ReasonError) throw e; throw e; }
    let filter: Record<string, any>;
    try {
      filter = compileSegment(b?.definition as SegmentDefinition);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'invalid_segment');
    }
    const doc: any = {
      id: `seg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name_ar: String(b?.name_ar || '').trim() || 'شريحة بدون اسم',
      description_ar: String(b?.description_ar || '').trim() || null,
      definition: b.definition,
      count_at_creation: await this.conn.collection('users').countDocuments(filter),
      created_by: me.id,
      createdAt: new Date(), updatedAt: new Date(),
    };
    await this.conn.collection('segments').insertOne(doc);
    await this.audit.write({
      action: 'segment_create', actor: me, target_type: 'segment', target_id: doc.id,
      reason, after: { name_ar: doc.name_ar, rules: doc.definition?.rules?.length },
    });
    const { _id, ...clean } = doc;
    return clean;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    let reason: string;
    try { reason = validateReason(b?.reason); } catch (e) { if (e instanceof ReasonError) throw e; throw e; }
    const before: any = await this.conn.collection('segments').findOne({ id });
    if (!before) throw new NotFoundException('segment_not_found');
    await this.conn.collection('segments').deleteOne({ id });
    await this.audit.write({
      action: 'segment_delete', actor: me, target_type: 'segment', target_id: id,
      reason, before: { name_ar: before.name_ar },
    });
    return { ok: true };
  }

  /** Members listing for a stored segment (paginated, real query). */
  @Get(':id/members')
  @RequirePermissions(Permission.CRM_READ)
  async members(@Param('id') id: string, @Query('page') page = '1', @Query('limit') limit = '25') {
    const seg: any = await this.conn.collection('segments').findOne({ id });
    if (!seg) throw new NotFoundException('segment_not_found');
    let filter: Record<string, any>;
    try { filter = compileSegment(seg.definition); } catch (e: any) {
      throw new BadRequestException(`segment_no_longer_compilable:${e?.message}`);
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, parseInt(limit, 10) || 25);
    const col = this.conn.collection('users');
    const [items, total] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l)
        .project({ _id: 0, id: 1, full_name: 1, phone: 1, email: 1, city: 1, createdAt: 1 })
        .toArray(),
      col.countDocuments(filter),
    ]);
    return { segment: { id: seg.id, name_ar: seg.name_ar }, data: items, total, page: p, pages: Math.ceil(total / l) };
  }
}
