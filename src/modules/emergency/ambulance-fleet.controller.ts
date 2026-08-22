import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get,
  Injectable, NotFoundException, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AmbulanceVehicle, AmbulanceVehicleDocument } from '../../schemas/ambulance-vehicle.schema';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

// clinic accounts carry the HOSPITAL role (typeToRole), so both fleet owners are covered.
const FLEET_ROLES = [UserRole.AMBULANCE, UserRole.HOSPITAL];

@Injectable()
export class AmbulanceFleetService {
  constructor(
    @InjectModel(AmbulanceVehicle.name) private model: Model<AmbulanceVehicleDocument>,
  ) {}

  list(accountId: string) {
    return this.model.find({ provider_account_id: accountId }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
  }

  async create(accountId: string, body: any) {
    if (!body?.plate_number || typeof body.plate_number !== 'string' || body.plate_number.trim().length < 3) {
      throw new BadRequestException('plate_number_required');
    }
    const dup = await this.model.findOne({ plate_number: body.plate_number.trim(), status: { $ne: 'rejected' } });
    if (dup) throw new BadRequestException('plate_number_already_registered');
    const doc = await this.model.create({
      provider_account_id: accountId,
      plate_number: body.plate_number.trim(),
      model: body.model, year: body.year,
      equipment: Array.isArray(body.equipment) ? body.equipment : [],
      paramedic_count: Math.max(1, parseInt(body.paramedic_count, 10) || 1),
      has_icu: !!body.has_icu,
      vehicle_type: ['BLS', 'ALS', 'ICU'].includes(body.vehicle_type) ? body.vehicle_type : (body.has_icu ? 'ICU' : 'BLS'),
      base_city: body.base_city,
      documents: Array.isArray(body.documents) ? body.documents : [],
      status: 'pending',
    });
    return this.model.findOne({ id: doc.id }, { _id: 0, __v: 0 }).lean();
  }

  async update(accountId: string, id: string, body: any) {
    const v = await this.model.findOne({ id, provider_account_id: accountId });
    if (!v) throw new NotFoundException('vehicle_not_found');
    const allowed = ['model', 'year', 'equipment', 'paramedic_count', 'has_icu', 'vehicle_type', 'base_city', 'documents', 'is_available', 'last_location'];
    for (const k of allowed) if (body[k] !== undefined) (v as any)[k] = body[k];
    if (body.vehicle_type !== undefined && !['BLS', 'ALS', 'ICU'].includes(body.vehicle_type)) {
      throw new BadRequestException('invalid_vehicle_type');
    }
    if (body.plate_number && body.plate_number !== v.plate_number) v.plate_number = String(body.plate_number).trim();
    // Any change to a reviewed vehicle goes back to admin review
    if (v.status === 'approved') v.status = 'pending';
    await v.save();
    return this.model.findOne({ id }, { _id: 0, __v: 0 }).lean();
  }

  async remove(accountId: string, id: string) {
    const res = await this.model.deleteOne({ id, provider_account_id: accountId });
    if (!res.deletedCount) throw new NotFoundException('vehicle_not_found');
    return { ok: true };
  }

  adminList(status?: string) {
    const q: any = status ? { status } : {};
    return this.model.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200).lean();
  }

  async review(id: string, adminId: string, approve: boolean, notes?: string) {
    const v = await this.model.findOne({ id });
    if (!v) throw new NotFoundException('vehicle_not_found');
    if (v.status !== 'pending') throw new BadRequestException(`already_reviewed_${v.status}`);
    v.status = approve ? 'approved' : 'rejected';
    v.reviewed_by = adminId;
    v.reviewed_at = new Date();
    v.admin_notes = notes;
    await v.save();
    return this.model.findOne({ id }, { _id: 0, __v: 0 }).lean();
  }
}

@Controller('provider/ambulance/fleet')
@UseGuards(JwtAuthGuard)
export class ProviderAmbulanceFleetController {
  constructor(private svc: AmbulanceFleetService) {}

  private assertFleetRole(user: any) {
    if (!FLEET_ROLES.includes(user?.role)) {
      throw new ForbiddenException('only_ambulance_or_facility_providers');
    }
  }

  @Get()
  list(@CurrentUser() user: any) {
    this.assertFleetRole(user);
    return this.svc.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    this.assertFleetRole(user);
    return this.svc.create(user.id, body);
  }

  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    this.assertFleetRole(user);
    return this.svc.update(user.id, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    this.assertFleetRole(user);
    return this.svc.remove(user.id, id);
  }
}

@Controller('admin/ambulance/fleet')
@UseGuards(JwtAuthGuard)
export class AdminAmbulanceFleetController {
  constructor(private svc: AmbulanceFleetService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  list(@Query('status') status?: string) {
    return this.svc.adminList(status);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  approve(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.svc.review(id, admin.id, true);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  reject(@Param('id') id: string, @CurrentUser() admin: any, @Body() body: any) {
    return this.svc.review(id, admin.id, false, body?.reason);
  }
}
