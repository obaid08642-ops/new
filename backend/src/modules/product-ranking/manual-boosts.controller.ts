import { Controller, Get, Post, Body, Param, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { ManualBoost, ManualBoostDocument } from './manual-boost.schema';

/** R77: governed manual boosts — ADMIN only, time-boxed, labeled, never ranked. */
@Controller('admin/manual-boosts')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class ManualBoostsController {
  constructor(@InjectModel(ManualBoost.name) private boosts: Model<ManualBoostDocument>) {}

  @Get()
  async list() {
    return this.boosts.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200).lean();
  }

  @Post()
  async create(@Body() dto: any) {
    const { entity_type, entity_id, weight, reason, starts_at, ends_at } = dto || {};
    if (!entity_type || !entity_id || !starts_at || !ends_at) throw new BadRequestException('entity_type_entity_id_window_required');
    if (new Date(ends_at).getTime() <= new Date(starts_at).getTime()) throw new BadRequestException('invalid_window');
    return this.boosts.create({ entity_type, entity_id, weight: Number(weight) || 1, reason, starts_at: new Date(starts_at), ends_at: new Date(ends_at), status: 'active' });
  }

  @Post(':id/revoke')
  async revoke(@Param('id') id: string) {
    const r = await this.boosts.updateOne({ _id: id } as any, { $set: { status: 'revoked' } });
    if (!r.matchedCount) throw new NotFoundException('boost_not_found');
    return { ok: true };
  }
}
