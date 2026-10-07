import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { EmergencyService } from './emergency.service';
import { CurrentUser, JwtAuthGuard, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { ServiceUnavailableException } from '@nestjs/common';
import { TriggerDto, TrackDto, ResolveDto, ClaimDto, AssignDto, Escalate997Dto } from './emergency.dto';

@Controller('emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyController {
  constructor(private svc: EmergencyService) {}

  @SelfService()
  @Post('trigger')
  trigger(@Body() body: TriggerDto, @CurrentUser() user: any) {
    return this.svc.trigger(user, body);
  }

  // M1-31: patients poll their own active SOS — no admin role required
  @Get('my/active')
  myActive(@CurrentUser() user: any) {
    return this.svc.myActive(user.id);
  }

  /** Patient cancels their own active SOS */
  @SelfService()
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.cancelOwn(id, user.id);
  }

  /** Driver/ambulance: open SOS pool + my assigned missions */
  @Get('driver/missions')
  driverMissions(@CurrentUser() user: any) {
    return this.svc.driverMissions(user.id);
  }

  /** Driver/ambulance: self-assign an open SOS (first-come-first-served) */
  @Roles(UserRole.AMBULANCE, UserRole.DELIVERY, UserRole.ADMIN)
  @Post(':id/claim')
  claim(@Param('id') id: string, @Body() body: ClaimDto, @CurrentUser() user: any) {
    return this.svc.claim(id, user.id, body?.vehicle_id);
  }

  /** Patient: live tracking of own active SOS (real unit GPS + computed ETA) */
  @Get('tracking')
  tracking(@CurrentUser() user: any) {
    return this.svc.tracking(user.id);
  }

  /** Driver who claimed: push unit GPS position (ownership enforced) */
  @Roles(UserRole.AMBULANCE, UserRole.DELIVERY, UserRole.ADMIN)
  @Post(':id/track')
  track(@Param('id') id: string, @Body() body: TrackDto, @CurrentUser() user: any) {
    return this.svc.updateUnitLocation(id, user.id, body);
  }

  @Get('active')
  @Roles(UserRole.ADMIN)
  active() {
    return this.svc.active();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  one(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/assign')
  @Roles(UserRole.ADMIN)
  assign(@Param('id') id: string, @Body() body: AssignDto, @CurrentUser() user: any) {
    return this.svc.assign(id, body.hospital_id, user);
  }

  /** P6.x-5: escalate an open SOS to 997. */
  @Roles(UserRole.ADMIN)
  @Post(':id/escalate-997')
  @Roles(UserRole.ADMIN)
  escalate997(@Param('id') id: string, @Body() body: Escalate997Dto, @CurrentUser() user: any) {
    return this.svc.escalate997(id, user, body?.notes);
  }

  /** Admin/dispatcher: (re)run the internal smart-dispatch engine for an open SOS */
  @Roles(UserRole.ADMIN)
  @Post(':id/auto-dispatch')
  @Roles(UserRole.ADMIN)
  autoDispatch(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.autoDispatch(id, user);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/resolve')
  @Roles(UserRole.ADMIN)
  resolve(@Param('id') id: string, @CurrentUser() user: any, @Body() body: ResolveDto) {
    return this.svc.resolve(id, user, body?.notes);
  }

  /** P22.14 Safety — Red-flag symptom check (chat/AI triage integration) */
  @Post('red-flags/check')
  checkRedFlags(@Body() body: { text: string; lang?: 'ar' | 'en' }) {
    const { detectRedFlags, checkAndGenerate997, generate997Response, EMERGENCY_NUMBER, EMERGENCY_NUMBER_LABEL_AR, EMERGENCY_NUMBER_LABEL_EN } = require('./emergency.service');
    const matches = detectRedFlags(body.text);
    const response997 = checkAndGenerate997(body.text, body.lang || 'ar');
    return {
      has_red_flags: !!matches,
      red_flags: matches,
      emergency_number: EMERGENCY_NUMBER,
      emergency_number_label: body.lang === 'ar' ? EMERGENCY_NUMBER_LABEL_AR : EMERGENCY_NUMBER_LABEL_EN,
      response997: response997,
    };
  }

  /** P22.14 Safety — Monthly SOS drill (admin only) */
  @Roles(UserRole.ADMIN)
  @Post('drill/run')
  async runSosDrill(@CurrentUser() user: any) {
    const { runSosDrill } = require('./emergency.service');
    const conn = (this.svc as any).conn;
    return runSosDrill(this.svc, user, conn);
  }

  @Roles(UserRole.ADMIN)
  @Get('drill/reports')
  async getDrillReports(@Query('limit') limit = 10) {
    const conn = (this.svc as any).conn;
    return conn.db.collection('sos_drill_reports').find({}).sort({ started_at: -1 }).limit(Number(limit)).toArray();
  }
}
