import { Module, Injectable, Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProviderAvailability, ProviderAvailabilitySchema } from '../../schemas/provider-availability.schema';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';

@Injectable()
export class ProviderOpsService {
  constructor(
    @InjectModel('ProviderAvailability') private avail: Model<any>,
    @InjectModel('ProviderProfile') private providers: Model<any>,
  ) {}

  private async resolveProviderId(user: any) {
    if (user.role === 'admin') return null;
    const p: any = await this.providers.findOne({ user_id: user.id }).lean();
    return p?.id || null;
  }

  async getMine(user: any) {
    const pid = await this.resolveProviderId(user);
    if (!pid) throw new BadRequestException('provider_profile_missing');
    let doc = await this.avail.findOne({ provider_id: pid });
    if (!doc) doc = await this.avail.create({ provider_id: pid, working_hours: defaultHours() });
    return doc.toObject ? doc.toObject() : doc;
  }

  async update(user: any, body: any) {
    const pid = await this.resolveProviderId(user);
    if (!pid) throw new BadRequestException('provider_profile_missing');
    const set: any = {};
    if (Array.isArray(body.working_hours)) set.working_hours = body.working_hours;
    if (Array.isArray(body.blocked_slots)) set.blocked_slots = body.blocked_slots.map((s: any) => ({ start: new Date(s.start), end: new Date(s.end), reason: s.reason }));
    if (body.vacation_mode !== undefined) set.vacation_mode = body.vacation_mode ? { from: new Date(body.vacation_mode.from), to: new Date(body.vacation_mode.to), reason: body.vacation_mode.reason } : null;
    if (typeof body.instant_available === 'boolean') set.instant_available = body.instant_available;
    await this.avail.updateOne({ provider_id: pid }, { $set: set }, { upsert: true });
    return this.avail.findOne({ provider_id: pid }).lean();
  }

  async toggleInstant(user: any) {
    const pid = await this.resolveProviderId(user);
    const doc: any = await this.avail.findOne({ provider_id: pid });
    const next = doc ? !doc.instant_available : true;
    await this.avail.updateOne({ provider_id: pid }, { $set: { instant_available: next } }, { upsert: true });
    return { instant_available: next };
  }
}
function defaultHours() { return [1, 2, 3, 4].flatMap((d) => [{ day: d, start: '09:00', end: '17:00' }]); }

@Controller('provider/ops')
@UseGuards(JwtAuthGuard)
export class ProviderOpsController {
  constructor(private svc: ProviderOpsService) {}
  @Get('availability') mine(@CurrentUser() u: any) { return this.svc.getMine(u); }
  @Post('availability') update(@CurrentUser() u: any, @Body() b: any) { return this.svc.update(u, b); }
  @Post('availability/toggle-instant') toggle(@CurrentUser() u: any) { return this.svc.toggleInstant(u); }
}

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'ProviderAvailability', schema: ProviderAvailabilitySchema },
    { name: 'ProviderProfile', schema: ProviderProfileSchema },
  ])],
  controllers: [ProviderOpsController],
  providers: [ProviderOpsService],
  exports: [ProviderOpsService],
})
export class ProviderOpsModule {}
