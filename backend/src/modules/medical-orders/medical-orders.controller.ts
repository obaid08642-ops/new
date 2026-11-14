import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { LinkBookingDto, MedicalOrderDto, MedicalOrderItemActionDto } from './medical-orders.dto';
import { MedicalOrdersService } from './medical-orders.service';

// The doctor writes the order after the visit (the doctor of that appointment only).
@Controller('doctors/appointments')
@Roles(UserRole.DOCTOR)
export class DoctorMedicalOrderController {
  constructor(private readonly svc: MedicalOrdersService) {}

  @Post(':id/medical-order') create(@CurrentUser() u: any, @Param('id') id: string, @Body() body: MedicalOrderDto) {
    return this.svc.create(u, id, body);
  }
}

// The patient's view and actions. Literal routes are declared before ':id' so they are not read as an id.
@Controller('medical-orders')
export class MedicalOrdersController {
  constructor(private readonly svc: MedicalOrdersService) {}

  @Get('mine') @Roles(UserRole.PATIENT)
  mine(@CurrentUser() u: any, @Query('active') active?: string) { return this.svc.mine(u, active === '1'); }

  /** The doctor's own recent visits an order can still be written for (in progress, or completed within the window). */
  @Get('visits') @Roles(UserRole.DOCTOR)
  visits(@CurrentUser() u: any) { return this.svc.recentVisits(u); }

  @Get('renew-requests') @Roles(UserRole.DOCTOR)
  renewRequests(@CurrentUser() u: any) { return this.svc.renewRequests(u); }

  @Get(':id') @Roles(UserRole.PATIENT, UserRole.DOCTOR)
  getOne(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(u, id); }

  @Post(':id/items/:itemId/order') @Roles(UserRole.PATIENT) @HttpCode(200)
  order(@CurrentUser() u: any, @Param('id') id: string, @Param('itemId') itemId: string, @Body() body: MedicalOrderItemActionDto) {
    return this.svc.order(u, id, itemId, body?.group_all === true);
  }

  @Post(':id/items/:itemId/defer') @Roles(UserRole.PATIENT) @HttpCode(200)
  defer(@CurrentUser() u: any, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.defer(u, id, itemId);
  }

  @Post(':id/items/:itemId/link-booking') @Roles(UserRole.PATIENT) @HttpCode(200)
  linkBooking(@CurrentUser() u: any, @Param('id') id: string, @Param('itemId') itemId: string, @Body() body: LinkBookingDto) {
    return this.svc.linkBooking(u, id, itemId, body);
  }

  @Post(':id/renew-request') @Roles(UserRole.PATIENT)
  renew(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.renewRequest(u, id); }
}
