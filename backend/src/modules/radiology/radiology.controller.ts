import { Controller, Get, Post, Body, Param, Query, Patch, Put, Delete, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { RadiologyOpsService } from './radiology.service';
import { Public, CurrentUser, SelfService, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('radiology')
export class RadiologyController {
  constructor(private readonly svc: RadiologyOpsService) {}

  @Public() @Get('services')
  services(
    @Query('modality') m?: string,
    @Query('body_part') bp?: string,
    @Query('search') q?: string,
    @Query('home_only') ho?: string,
    @Query('home_visit') hv?: string,
    @Query('highest_rated') hr?: string,
    @Query('nearest') nr?: string,
    @Query('lowest_price') lp?: string
  ) {
    return this.svc.list({ 
      modality: m, 
      body_part: bp, 
      search: q, 
      home_only: ho === '1' || hv === 'true' || hv === '1',
      highest_rated: hr === 'true' || hr === '1',
      nearest: nr === 'true' || nr === '1',
      lowest_price: lp === 'true' || lp === '1'
    });
  }

  @Public() @Get('modalities')
  modalities() { return this.svc.modalities(); }

  @Public() @Get('services/:id')
  one(@Param('id') id: string) { return this.svc.getById(id); }

  @SelfService()
  @Post('bookings')
  book(@Body() body: any, @CurrentUser() user: any) { return this.svc.book(user, body); }

  @Get('bookings/mine')
  mine(@CurrentUser() user: any) { return this.svc.mineFor(user); }

  @Get('bookings/:id')
  oneBooking(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.getBooking(id, user); }

  @SelfService()
  @Post('bookings/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.cancel(id, user); }

  @Roles(UserRole.PATIENT, UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Patch('bookings/:id/state')
  transition(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.transition(id, body.state, user, body.note);
  }

  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/publish-report')
  publish(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.publishReport(id, body, user);
  }

  @Get('reports/mine')
  myReports(@CurrentUser() user: any) { return this.svc.myReports(user); }

  @SelfService()
  @Post('bookings/:id/documents')
  uploadDoc(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.addDocument(id, user, body);
  }

  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Patch('bookings/:id/insurance')
  updateIns(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateInsuranceStatus(id, user, body.status, body.reason);
  }

  @Get('provider/inbox')
  providerInbox(@Query('status') st: string | undefined, @CurrentUser() user: any) {
    return this.svc.listForProvider(user, st);
  }

  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/assign-technician')
  assignTech(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.assignTechnician(id, user, body || {});
  }

  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/upload-report')
  uploadReport(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.uploadReport(id, user, body || {});
  }

  // --- PILLAR 5: Check-In & Scanning Workflow ---
  @SelfService()
  @Post('bookings/:id/checkin')
  checkin(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.checkin(id, user);
  }

  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/start-scan')
  startScan(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.startScan(id, user);
  }

  // PILLAR 5: Abort Scan — Emergency edge case
  @SelfService()
  @Post('bookings/:id/abort')
  abortScan(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: any) {
    return this.svc.abortScan(id, user, body.reason);
  }

  // MODULE 10: Report Quality Workflow
  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/submit-report-for-review')
  submitForReview(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.submitReportForReview(id, user, body);
  }

  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/approve-report')
  approveReport(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.approveReport(id, user);
  }

  // PILLAR 4: Insurance NPHIES Gatekeeper
  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/insurance-approval')
  insuranceApproval(@Param('id') id: string, @Body() body: { approval_code: string; copay: number }, @CurrentUser() user: any) {
    return this.svc.processInsuranceApproval(id, user, body);
  }

  // MODULE 14: Rebooking after abort/cancel
  @Roles(UserRole.PATIENT, UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Patch('bookings/:id/reschedule')
  reschedule(@Param('id') id: string, @Body() body: { new_date: string; reason: string }, @CurrentUser() user: any) {
    return this.svc.rescheduleBooking(id, user, body);
  }

  // MODULE 9: Availability & Slots
  @Get('bookings/:id/tracking')
  tracking(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getTracking(id, user);
  }

  // MODULE 15: Catalog Delta Request (goes to admin for approval)
  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('catalog/delta-request')
  catalogDeltaRequest(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.catalogDeltaRequest(user, body);
  }

  // MODULE 12: Preparation confirmed by patient
  @SelfService()
  @Post('bookings/:id/confirm-preparation')
  confirmPrep(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.confirmPreparation(id, user);
  }

  @Get('admin/all')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  adminAll(@Query() q: any) {
    return this.svc.adminListAll({ 
      status: q.status, 
      insurance_status: q.insurance_status, 
      location_type: q.location_type, 
      delayed_only: q.delayed_only,
      disputed_only: q.disputed_only,
      limit: q.limit ? parseInt(q.limit, 10) : undefined 
    });
  }

  // --- Admin Catalog CRUD ---
  @Roles(UserRole.ADMIN)
  @Post('admin/catalog')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  createCatalog(@CurrentUser() u: any, @Body() b: any) {
    return this.svc.createCatalog(u, b);
  }

  @Roles(UserRole.ADMIN)
  @Put('admin/catalog/:id')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  updateCatalog(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateCatalog(u, id, b);
  }

  @Roles(UserRole.ADMIN)
  @Delete('admin/catalog/:id')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  deleteCatalog(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deleteCatalog(u, id);
  }

  // --- Admin Quality Control & Dispute Intervention ---
  @Roles(UserRole.ADMIN)
  @Patch('admin/bookings/:id/force-state')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  forceState(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.adminForceState(u, id, b.state, b.note);
  }
}
