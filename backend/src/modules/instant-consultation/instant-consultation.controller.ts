import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { InstantAvailabilityDto, InstantRequestDto } from './instant-consultation.dto';
import { InstantConsultationService } from './instant-consultation.service';

// Doctor side: turn instant consultations on or off, see and answer the open requests of the specialty.
@Controller('doctors')
@Roles(UserRole.DOCTOR)
export class DoctorInstantConsultationController {
  constructor(private readonly svc: InstantConsultationService) {}

  @Put('me/instant-availability') setAvailability(@CurrentUser() u: any, @Body() body: InstantAvailabilityDto) {
    return this.svc.setAvailability(u, body.available);
  }
  @Get('instant-requests') open(@CurrentUser() u: any) { return this.svc.openForDoctor(u); }
  @Post('instant-requests/:id/accept') @HttpCode(200) accept(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.accept(u, id); }
  @Post('instant-requests/:id/decline') @HttpCode(200) decline(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.decline(u, id); }
}

// Patient side: broadcast, read, cancel.
@Controller('consultations/instant')
@Roles(UserRole.PATIENT)
export class PatientInstantConsultationController {
  constructor(private readonly svc: InstantConsultationService) {}

  @Post() create(@CurrentUser() u: any, @Body() body: InstantRequestDto) { return this.svc.create(u, body); }
  @Get(':id') get(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.get(u, id); }
  @Post(':id/cancel') @HttpCode(200) cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancel(u, id); }
}
