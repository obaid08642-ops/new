import { Body, Controller, Get, Param, Post, Put, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Readable } from 'stream';
import { CurrentUser, JwtAuthGuard, NoGuestsGuard, Public, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRateLimit, UserRateLimitGuard } from '../../common/user-rate-limit';
import { RevokeSickLeaveDto, SehaNumberDto } from './sick-leave.dto';
import { SickLeaveService } from './sick-leave.service';

/** The patient's own certificates: the list (ID number masked), one in full, and its PDF. Someone else's certificate is a 404. */
@UseGuards(JwtAuthGuard, NoGuestsGuard)
@Controller('care/sick-leaves')
@SelfService()
export class PatientSickLeaveController {
  constructor(private readonly svc: SickLeaveService) {}

  @Get() list(@CurrentUser() user: any) { return this.svc.listForPatient(String(user.id)); }
  @Get(':id') one(@CurrentUser() user: any, @Param('id') id: string) { return this.svc.oneForPatient(String(user.id), id); }

  @Get(':id/pdf')
  async pdf(@CurrentUser() user: any, @Param('id') id: string, @Res({ passthrough: true }) res: any) {
    const buf = await this.svc.pdfForPatient(String(user.id), id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="medical-report-${id.replace(/[^A-Za-z0-9-]/g, '').slice(0, 40)}.pdf"`, 'Cache-Control': 'private, no-store' });
    return new StreamableFile(Readable.from(buf));
  }
}

/** The doctor's side: their issued certificates and the revoke. (Issuing is POST /provider/requests/:appointmentId/sick-leave, which already existed.) */
@UseGuards(JwtAuthGuard)
@Controller('provider/sick-leaves')
@Roles(UserRole.DOCTOR, UserRole.ADMIN)
export class ProviderSickLeaveController {
  constructor(private readonly svc: SickLeaveService) {}

  @Get() list(@CurrentUser() user: any) { return this.svc.listForDoctor(String(user.id)); }
  @Post(':id/revoke') revoke(@CurrentUser() user: any, @Param('id') id: string, @Body() body: RevokeSickLeaveDto) { return this.svc.revoke(user, id, body?.reason); }

  /** The Seha number of the leave the doctor registered there (optional, editable by the issuing doctor only, audit-logged; the patient is told). */
  @Put(':id/seha-number') seha(@CurrentUser() user: any, @Param('id') id: string, @Body() body: SehaNumberDto) { return this.svc.setSehaNumber(user, id, body?.seha_number); }
}

/** Admin: medical reports still without a Seha number after N days (default 3). */
@UseGuards(JwtAuthGuard)
@Controller('admin/medical-reports')
@Roles(UserRole.ADMIN)
export class AdminSickLeaveController {
  constructor(private readonly svc: SickLeaveService) {}

  @Get('without-seha-number')
  @RequirePermissions(Permission.APPOINTMENT_READ)
  list(@Query('days') days?: string) { return this.svc.listWithoutSeha(days); }
}

/** The page behind the QR code: no account needed, 30 looks per 10 minutes per address, and only valid / revoked, initials and dates in the answer. */
@Controller('verify/sick-leave')
export class PublicSickLeaveVerifyController {
  constructor(private readonly svc: SickLeaveService) {}

  @Public()
  @UseGuards(UserRateLimitGuard)
  @UserRateLimit('sick_leave_verify', 30, 600)
  @Get(':code')
  verify(@Param('code') code: string) { return this.svc.verify(code); }
}
