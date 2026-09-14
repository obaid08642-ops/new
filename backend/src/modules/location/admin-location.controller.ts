import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Location, LocationDocument } from '../location/schemas/location.schema';

/**
 * Admin location governance: add / edit / deactivate cities and districts.
 * Reads stay on the public /api/v1/locations/* endpoints (GeoPicker fixed).
 */
@Controller('admin/locations')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminLocationController {
  constructor(@InjectModel(Location.name) private readonly locations: Model<LocationDocument>) {}

  @Get()
  async list(@Query('type') type?: string, @Query('parent') parent?: string, @Query('q') q?: string, @Query('include_inactive') includeInactive?: string) {
    const filter: any = {};
    if (type) filter.type = type;
    if (parent) filter.parent_code = parent;
    if (q) filter.$or = [{ name_ar: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { name_en: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { code: q }];
    if (includeInactive !== '1') filter.is_active = { $ne: false };
    return this.locations.find(filter, { _id: 0, __v: 0 }).sort({ type: 1, name_ar: 1 }).limit(500).lean();
  }

  @Post()
  async create(@Body() body: any) {
    const { code, name_ar, name_en, type, parent_code, aliases } = body || {};
    if (!code || !name_ar || !name_en || !type) throw new BadRequestException('code_name_type_required');
    if (!['region', 'city', 'district', 'sub_area'].includes(type)) throw new BadRequestException('invalid_type');
    if (await this.locations.findOne({ code }).lean()) throw new BadRequestException('code_exists');
    if (parent_code && !(await this.locations.findOne({ code: parent_code }).lean())) throw new BadRequestException('parent_not_found');
    const doc = await this.locations.create({ code, name_ar, name_en, type, parent_code: parent_code || null, aliases: Array.isArray(aliases) ? aliases : [], is_active: true });
    return doc.toObject();
  }

  @Put(':code')
  async update(@Param('code') code: string, @Body() body: any) {
    const allowed = ['name_ar', 'name_en', 'aliases', 'is_active', 'coverage'];
    const set: any = {};
    for (const k of allowed) if (body?.[k] !== undefined) set[k] = body[k];
    const updated = await this.locations.findOneAndUpdate({ code }, { $set: set }, { new: true, projection: { _id: 0, __v: 0 } }).lean();
    if (!updated) throw new NotFoundException('location_not_found');
    return updated;
  }

  @Delete(':code')
  async remove(@Param('code') code: string) {
    const children = await this.locations.countDocuments({ parent_code: code, is_active: { $ne: false } });
    if (children > 0) throw new BadRequestException('has_active_children');
    // Soft-delete: keeps history + seeds idempotent; public queries filter is_active.
    const updated = await this.locations.findOneAndUpdate({ code }, { $set: { is_active: false } }, { new: true }).lean();
    if (!updated) throw new NotFoundException('location_not_found');
    return { ok: true };
  }
}
