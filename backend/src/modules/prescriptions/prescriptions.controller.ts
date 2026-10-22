import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CurrentUser, JwtAuthGuard, Roles, SelfService } from '../../common/auth.guard';
import { PrescriptionState, UserRole } from '../../common/enums';
import { CreateDto, UploadDto, ManualEntryDto, SendDto, TransitionDto, SubDto} from './prescriptions.dto';

@Controller('prescriptions')
@SelfService()
@UseGuards(JwtAuthGuard)
export class PrescriptionsController {
  constructor(private svc: PrescriptionsService) {}

  @Post('create')
  @Roles(UserRole.DOCTOR)
  create(@Body() body: CreateDto, @CurrentUser() user: any) {
    return this.svc.create(user, body);
  }

  @Post('upload')
  upload(@Body() body: UploadDto, @CurrentUser() user: any) {
    return this.svc.uploadByPatient(user, body);
  }

  /** D-32: the patient deletes their own uploaded prescription and its photo. */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.deleteByPatient(user, id);
  }

  @Post('manual-entry')
  @Roles(UserRole.DOCTOR)
  manualEntry(@Body() body: ManualEntryDto, @CurrentUser() user: any) {
    return this.svc.create(user, body);
  }

  @Post(':id/send')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  send(@Param('id') id: string, @Body() body: SendDto, @CurrentUser() user: any) {
    return this.svc.sendToPharmacy(id, body.pharmacy_id, user);
  }

  @Post(':id/transition')
  transition(@Param('id') id: string, @Body() body: TransitionDto, @CurrentUser() user: any) {
    return this.svc.transition(id, body.to, user);
  }

  @Post(':id/verify')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  verify(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.verifyByPharmacist(id, user);
  }

  @Post(':id/substitute')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  sub(@Param('id') id: string, @Body() body: SubDto, @CurrentUser() user: any) {
    return this.svc.substitute(id, body.item_index, body.new_medicine_id, user);
  }

  @Get('manual-review/queue')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  manualReviewQueue(@CurrentUser() user: any) { return this.svc.manualReviewQueue(user); }

  @Get('active')
  active(@CurrentUser() user: any) { return this.svc.activeForPatient(user); }

  @Get('mine')
  mine(@CurrentUser('id') id: string) {
    return this.svc.listMine(id);
  }

  @Get('doctor/mine')
  @Roles(UserRole.DOCTOR)
  doctorMine(@CurrentUser('id') id: string, @Query('patient_id') patientId?: unknown, @Query('appointment_id') appointmentId?: unknown) {
    // A repeated or bracketed query parameter arrives as an array or object; only a plain id string is a filter.
    const plain = (value: unknown): string | undefined => {
      if (value === undefined || value === '') return undefined;
      if (typeof value !== 'string' || value.length > 128) throw new BadRequestException('invalid_filter');
      return value;
    };
    return this.svc.listForDoctor(id, { patient_id: plain(patientId), appointment_id: plain(appointmentId) });
  }

  @Get('pharmacy/queue')
  @Roles(UserRole.PHARMACY)
  pharmacyQueue(@CurrentUser('id') id: string) {
    return this.svc.listForPharmacy(id);
  }

  @Get(':id/image')
  image(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getImageForUser(id, user);
  }

  @Get(':id')
  one(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getByIdForUser(id, user);
  }
}
