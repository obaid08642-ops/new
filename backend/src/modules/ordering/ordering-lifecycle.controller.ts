import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { ArriveDto, AssignStaffDto, ResultsDto, StaffDto } from './ordering.dto';
import { OrderingLifecycleService } from './ordering-lifecycle.service';

// M7, the patient's side: own bookings only (404 otherwise).
@Controller('ordering/bookings')
@Roles(UserRole.PATIENT)
export class OrderingLifecycleController {
  constructor(private readonly svc: OrderingLifecycleService) {}

  @Get(':id') one(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.view(u, id); }
  @Get(':id/visit') visit(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.visit(u, id); }
  @Get(':id/reminders') reminders(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.reminders(u, id); }
  @Get(':id/results') results(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.results(u, id); }
  @Post(':id/results/discuss') discuss(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.discuss(u, id); }
  @Post(':id/emergency') @HttpCode(200) emergency(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.emergency(u, id); }
}

// M7, the provider's side: only the booking's own provider acts on it (403 another provider, 404 unknown).
@Controller('provider/ordering')
@Roles(UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSING, UserRole.NURSE)
export class ProviderLifecycleController {
  constructor(private readonly svc: OrderingLifecycleService) {}

  @Post('bookings/:id/confirm') @HttpCode(200) confirm(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.confirm(u, id); }
  @Post('bookings/:id/assign') @HttpCode(200) assign(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() body: AssignStaffDto) { return this.svc.assign(u, id, body.staff_id); }
  @Post('bookings/:id/arrive') @HttpCode(200) arrive(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() body: ArriveDto) { return this.svc.arrive(u, id, body); }
  @Post('bookings/:id/results') @HttpCode(200) results(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() body: ResultsDto) { return this.svc.postResults(u, id, body); }
  @Get('reliability') reliability(@CurrentUser() u: { id: string }) { return this.svc.reliability(u); }
  @Get('staff') staff(@CurrentUser() u: { id: string }) { return this.svc.listStaff(u); }
  @Put('staff') putStaff(@CurrentUser() u: { id: string }, @Body() body: StaffDto) { return this.svc.putStaff(u, body); }
}
