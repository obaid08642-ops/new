/**
 * Hospital / Clinic Multi-Staff Module — sub-user CRUD
 * - The owning provider account (hospital/clinic) can create sub-users (doctors, lab staff, radiology staff, nurses)
 * - Each staff member is created as a full User with role from `staff_role`
 * - Sub-user is linked back to owner via `parent_provider_account_id`
 */
import { Module, Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ForbiddenException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { User, UserSchema, UserDocument } from '../../schemas/user.schema';
import { ProviderAccount, ProviderAccountSchema } from '../provider/schemas';
import { UserRole } from '../../common/enums';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const STAFF_ROLES: UserRole[] = [UserRole.DOCTOR, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.PHARMACY];

@Injectable()
export class HospitalStaffService {
  constructor(
    @InjectModel(User.name) private users: Model<UserDocument>,
    @InjectModel(ProviderAccount.name) private accounts: Model<any>,
  ) {}

  private async getOwnerAccount(user: any) {
    if (![UserRole.HOSPITAL, UserRole.ADMIN].includes(user.role)) throw new ForbiddenException('only_hospital_owner');
    const acc = await this.accounts.findOne({ owner_user_id: user.id });
    if (!acc && user.role !== UserRole.ADMIN) throw new NotFoundException('provider_account_missing');
    return acc;
  }

  async list(user: any) {
    const acc = await this.getOwnerAccount(user);
    const filter: any = acc ? { parent_account_id: acc.id } : {};
    return this.users.find(filter, { password_hash: 0, _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
  }

  async create(user: any, body: { full_name: string; phone: string; email?: string; password: string; staff_role: string; department?: string; permissions?: string[]; schedule?: any; specialty?: string; degree?: string; years_experience?: number; license_number?: string; consultation_fee?: number }) {
    const acc = await this.getOwnerAccount(user);
    if (!body?.full_name?.trim() || !body?.phone?.trim() || !body?.password) throw new BadRequestException('full_name_phone_password_required');
    const role = body.staff_role as UserRole;
    if (!STAFF_ROLES.includes(role)) throw new BadRequestException('invalid_staff_role');
    const existing = await this.users.findOne({ $or: [{ phone: body.phone.trim() }, ...(body.email ? [{ email: body.email.trim().toLowerCase() }] : [])] });
    if (existing) throw new BadRequestException('user_exists');
    const hash = await bcrypt.hash(body.password, 10);
    const u = await this.users.create({
      id: uuid(),
      full_name: body.full_name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim().toLowerCase(),
      password_hash: hash,
      role,
      verified: true,
      parent_account_id: acc?.id,
      department: body.department,
      permissions: body.permissions || [],
      schedule: body.schedule,
      suspended: false,
      specialty: body.specialty,
      degree: body.degree,
      years_experience: body.years_experience,
      license_number: body.license_number,
      consultation_fee: body.consultation_fee || 0,
    });
    const o: any = u.toObject(); delete o.password_hash; delete o._id; delete o.__v;
    return o;
  }

  async update(user: any, staffId: string, body: { full_name?: string; phone?: string; email?: string; department?: string; permissions?: string[]; schedule?: any; specialty?: string; degree?: string; years_experience?: number; license_number?: string; consultation_fee?: number }) {
    const acc = await this.getOwnerAccount(user);
    const staff = await this.users.findOne({ id: staffId });
    if (!staff) throw new NotFoundException('staff_not_found');
    if (acc && staff.get('parent_provider_account_id') !== acc.id && user.role !== UserRole.ADMIN) throw new ForbiddenException('not_owner');
    const patch: any = {};
    for (const k of ['full_name', 'phone', 'email', 'department', 'permissions', 'schedule', 'specialty', 'degree', 'years_experience', 'license_number', 'consultation_fee']) if ((body as any)[k] !== undefined) patch[k] = (body as any)[k];
    if (patch.email) patch.email = String(patch.email).toLowerCase();
    await this.users.updateOne({ id: staffId }, { $set: patch });
    const u: any = await this.users.findOne({ id: staffId }, { password_hash: 0, _id: 0, __v: 0 }).lean();
    return u;
  }

  async suspend(user: any, staffId: string, suspended: boolean) {
    const acc = await this.getOwnerAccount(user);
    const staff = await this.users.findOne({ id: staffId });
    if (!staff) throw new NotFoundException('staff_not_found');
    if (acc && staff.get('parent_provider_account_id') !== acc.id && user.role !== UserRole.ADMIN) throw new ForbiddenException('not_owner');
    await this.users.updateOne({ id: staffId }, { $set: { suspended } });
    return { ok: true, suspended };
  }

  async remove(user: any, staffId: string) {
    const acc = await this.getOwnerAccount(user);
    const staff = await this.users.findOne({ id: staffId });
    if (!staff) throw new NotFoundException('staff_not_found');
    if (acc && staff.get('parent_provider_account_id') !== acc.id && user.role !== UserRole.ADMIN) throw new ForbiddenException('not_owner');
    await this.users.deleteOne({ id: staffId });
    return { ok: true };
  }

  async resetPassword(user: any, staffId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) throw new BadRequestException('weak_password');
    const acc = await this.getOwnerAccount(user);
    const staff = await this.users.findOne({ id: staffId });
    if (!staff) throw new NotFoundException('staff_not_found');
    if (acc && staff.get('parent_provider_account_id') !== acc.id && user.role !== UserRole.ADMIN) throw new ForbiddenException('not_owner');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.users.updateOne({ id: staffId }, { $set: { password_hash: hash } });
    return { ok: true };
  }
}

@Controller('hospital/staff')
@UseGuards(JwtAuthGuard)
export class HospitalStaffController {
  constructor(private svc: HospitalStaffService) {}
  @Get() list(@CurrentUser() u: any) { return this.svc.list(u); }
  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
  @Patch(':id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.update(u, id, b); }
  @Post(':id/suspend') suspend(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { suspended?: boolean }) { return this.svc.suspend(u, id, b?.suspended !== false); }
  @Post(':id/reset-password') reset(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { password: string }) { return this.svc.resetPassword(u, id, b?.password); }
  @Delete(':id') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.remove(u, id); }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ProviderAccount.name, schema: ProviderAccountSchema },
    ]),
  ],
  controllers: [HospitalStaffController],
  providers: [HospitalStaffService],
  exports: [HospitalStaffService],
})
export class HospitalStaffModule {}
