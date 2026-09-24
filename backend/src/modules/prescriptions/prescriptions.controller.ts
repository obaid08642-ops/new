import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
  doctorMine(@CurrentUser('id') id: string) {
    return this.svc.listForDoctor(id);
  }

  @Get('pharmacy/queue')
  @Roles(UserRole.PHARMACY)
  pharmacyQueue(@CurrentUser('id') id: string) {
    return this.svc.listForPharmacy(id);
  }

  @Get(':id')
  one(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getByIdForUser(id, user);
  }
}
