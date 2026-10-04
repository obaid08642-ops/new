import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, NoGuestsGuard, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { CreateDoctorOrderDto } from './doctor-orders.dto';
import { DoctorOrdersService } from './doctor-orders.service';

/** WP-K: a doctor orders tests or nursing for the patient of their own appointment. */
@UseGuards(JwtAuthGuard, NoGuestsGuard)
@Controller('provider/doctor-orders')
@Roles(UserRole.DOCTOR)
export class ProviderDoctorOrdersController {
  constructor(private readonly svc: DoctorOrdersService) {}
  @Post() create(@CurrentUser() u: any, @Body() b: CreateDoctorOrderDto) { return this.svc.create(u, b); }
  @Get('mine') mine(@CurrentUser() u: any) { return this.svc.forDoctor(u); }
}

/** WP-K: the patient's orders from their doctors, to book from the app or the website. */
@UseGuards(JwtAuthGuard, NoGuestsGuard)
@Controller('patient/doctor-orders')
export class PatientDoctorOrdersController {
  constructor(private readonly svc: DoctorOrdersService) {}
  @SelfService()
  @Get() mine(@CurrentUser() u: any) { return this.svc.forPatient(u); }
}
