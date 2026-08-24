import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { EmergencyService } from './emergency.service';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { ServiceUnavailableException } from '@nestjs/common';

@Controller('emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyController {
  constructor(private svc: EmergencyService) {}

  @Post('trigger')
  trigger(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.trigger(user, body);
  }

  // M1-31: patients poll their own active SOS — no admin role required
  @Get('my/active')
  myActive(@CurrentUser() user: any) {
    return this.svc.myActive(user.id);
  }

  /** Patient cancels their own active SOS */
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
  @Post(':id/claim')
  claim(@Param('id') id: string, @Body() body: { vehicle_id?: string }, @CurrentUser() user: any) {
    return this.svc.claim(id, user.id, body?.vehicle_id);
  }

  /** Patient: live tracking of own active SOS (real unit GPS + computed ETA) */
  @Get('tracking')
  tracking(@CurrentUser() user: any) {
    return this.svc.tracking(user.id);
  }

  /** Driver who claimed: push unit GPS position (ownership enforced) */
  @Post(':id/track')
  track(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateUnitLocation(id, user.id, body);
  }

  @Get('active')
  @Roles(UserRole.ADMIN)
  active() {
    throw new ServiceUnavailableException('admin emergency monitoring is unavailable pending approved emergency, location and consent contracts');
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  one(@Param('id') id: string) {
    throw new ServiceUnavailableException('admin emergency record access is unavailable pending approved emergency, location and consent contracts');
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN)
  assign(@Param('id') id: string, @Body() body: { hospital_id: string }, @CurrentUser() user: any) {
    throw new ServiceUnavailableException('manual emergency assignment is unavailable pending approved dispatch ownership controls');
  }

  /** Admin/dispatcher: (re)run the internal smart-dispatch engine for an open SOS */
  @Post(':id/auto-dispatch')
  @Roles(UserRole.ADMIN)
  autoDispatch(@Param('id') id: string, @CurrentUser() user: any) {
    throw new ServiceUnavailableException('manual emergency dispatch is unavailable pending approved dispatch ownership controls');
  }

  @Post(':id/resolve')
  @Roles(UserRole.ADMIN)
  resolve(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    throw new ServiceUnavailableException('manual emergency resolution is unavailable pending approved closure protocol');
  }
}
