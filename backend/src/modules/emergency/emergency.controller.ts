import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { EmergencyService } from './emergency.service';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyController {
  constructor(private svc: EmergencyService) {}

  @Post('trigger')
  trigger(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.trigger(user, body);
  }

  @Get('active')
  @Roles(UserRole.ADMIN)
  active() {
    return this.svc.active();
  }

  @Get('my-active')
  @Roles(UserRole.PATIENT)
  myActive(@CurrentUser() user: any) {
    return this.svc.activeForPatient(user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  one(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN)
  assign(@Param('id') id: string, @Body() body: { hospital_id: string }, @CurrentUser() user: any) {
    return this.svc.assign(id, body.hospital_id, user);
  }

  @Post(':id/resolve')
  @Roles(UserRole.ADMIN)
  resolve(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.svc.resolve(id, user, body?.notes);
  }
}
