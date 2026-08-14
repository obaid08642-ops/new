import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { PrescriptionState, UserRole } from '../../common/enums';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionsController {
  constructor(private svc: PrescriptionsService) {}

  @Post('create')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.create(user, body);
  }

  @Post('upload')
  upload(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.uploadByPatient(user, body);
  }

  @Post('manual-entry')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.ADMIN)
  manualEntry(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.create(user, body);
  }

  @Post(':id/send')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  send(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.sendToPharmacy(id, body.pharmacy_id, user);
  }

  @Post(':id/transition')
  transition(@Param('id') id: string, @Body() body: { to: PrescriptionState }, @CurrentUser() user: any) {
    return this.svc.transition(id, body.to, user);
  }

  @Post(':id/substitute')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  sub(@Param('id') id: string, @Body() body: { item_index: number; new_medicine_id: string }, @CurrentUser() user: any) {
    return this.svc.substitute(id, body.item_index, body.new_medicine_id, user);
  }

  @Get('mine')
  mine(@CurrentUser('id') id: string) {
    return this.svc.listMine(id);
  }

  @Get('doctor/mine')
  @Roles(UserRole.DOCTOR)
  doctorMine(@CurrentUser('id') id: string) {
    return this.svc.listForDoctor(id);
  }

  @Get('pharmacy/queue')
  @Roles(UserRole.PHARMACY)
  pharmacyQueue(@CurrentUser('id') id: string) {
    return this.svc.listForPharmacy(id);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.svc.getById(id);
  }
}
