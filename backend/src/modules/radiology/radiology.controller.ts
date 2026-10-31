import { PROVIDER_ROLES } from '../../common/enums';
import { UseInterceptors } from '@nestjs/common';
import { StripInternalReviewFieldsInterceptor } from '../../common/strip-internal-fields';
import { BadRequestException, Body, Controller, Get, Post, Param, Query, Patch, Put, Delete, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { RadiologyOpsService } from './radiology.service';
import { Public, CurrentUser, SelfService, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { BookDto, TransitionDto, UpdateInsDto, AssignTechDto, UploadReportDto, ForceStateDto, AbortScanDto, InsuranceApprovalDto, RescheduleDto, SubmitReportForReviewDto, RadiologyDocumentDto, CatalogDeltaRequestDto} from './radiology.dto';
import { CreateRadiologyCatalogDto, UpdateRadiologyCatalogDto, ApproveCatalogDto, BulkApproveCatalogDto } from './radiology.dto';

import { Permission, RequirePermissions } from '../../common/permissions';
import { PublicCache } from '../../common/public-cache.decorator';
@Controller('radiology')
@UseInterceptors(StripInternalReviewFieldsInterceptor)
export class RadiologyController {
  constructor(private readonly svc: RadiologyOpsService) {}

  @PublicCache(120, ['catalog', 'radiology'])
  @Public() @Get('services')
  services(
    @Query('modality') m?: string,
    @Query('body_part') bp?: string,
    @Query('search') q?: string,
    @Query('home_only') ho?: string,
    @Query('home_visit') hv?: string,
    @Query('insurance') ins?: string,
    @Query('highest_rated') hr?: string,
    @Query('nearest') nr?: string,
    @Query('lowest_price') lp?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('sort') sort?: string,
  ) {
    return this.svc.list({ 
      sort,
      // with `page` the answer is { data, total, page, limit, total_pages }; without it, the array as before
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
      // a scan's category is its modality (the client picks the illustration from it); `modality` wins when both are sent
      modality: m ?? category, 
      body_part: bp, 
      search: q, 
      home_only: ho === '1' || hv === 'true' || hv === '1',
      insurance: ins === '1' || ins === 'true',
      highest_rated: hr === 'true' || hr === '1',
      nearest: nr === 'true' || nr === '1',
      lowest_price: lp === 'true' || lp === '1',
      lat: lat !== undefined && Number.isFinite(Number(lat)) ? Number(lat) : undefined,
      lng: lng !== undefined && Number.isFinite(Number(lng)) ? Number(lng) : undefined
    });
  }

  @Public() @PublicCache(120, ['radiology', 'public-catalogue']) @Get('carousel')
  carousel(@Query('modality') modality?: string, @Query('limit') limit?: string) {
    return this.svc.getCarousel(modality, parseInt(limit || '20', 10));
  }

  @Public() @Get('price-comparison')
  priceComparison(@Query('serviceId') serviceId: string) {
    if (typeof serviceId !== 'string' || !serviceId) throw new BadRequestException('serviceId required');
    return this.svc.priceComparison(serviceId);
  }

  @Public() @Get('compatible-providers')
  compatibleProviders(@Query('serviceIds') ids?: string) { return this.svc.compatibleProviders(ids ? ids.split(',') : []); }

  @PublicCache(20, ['provider-slots'], { cacheControl: 'public, s-maxage=20' })
  @Public() @Get('providers/:providerAccountId/slots')
  providerSlots(
    @Param('providerAccountId') providerAccountId: string,
    @Query('date') date: string,
    @Query('duration') duration?: string
  ) {
    const dur = duration ? parseInt(duration, 10) : 30;
    if (!Number.isInteger(dur) || dur < 10 || dur > 120) {
      throw new BadRequestException('duration must be an integer between 10 and 120 minutes');
    }
    return this.svc.slotsForProvider(providerAccountId, date, dur);
  }

  @PublicCache(120, ['catalog', 'radiology'])
  @Public() @Get('modalities')
  modalities() { return this.svc.modalities(); }

  @PublicCache(120, ['catalog', 'radiology'])
  @Public() @Get('services/:id')
  one(@Param('id') id: string) { return this.svc.getByIdWithOffers(id); }

  @SelfService()
  @Post('bookings')
  book(@Body() body: BookDto, @CurrentUser() user: any) { return this.svc.book(user, body); }

  @Get('bookings/mine')
  mine(@CurrentUser() user: any) { return this.svc.mineFor(user); }

  @Get('bookings/:id')
  oneBooking(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.getBooking(id, user); }

  @SelfService()
  @Post('bookings/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.cancel(id, user); }

  @Roles(UserRole.PATIENT, UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Patch('bookings/:id/state')
  transition(@Param('id') id: string, @Body() body: TransitionDto, @CurrentUser() user: any) {
    return this.svc.transition(id, body.state, user, body.note);
  }

  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/publish-report')
  publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.publishReport(id, user);
  }

  @Get('reports/mine')
  myReports(@CurrentUser() user: any) { return this.svc.myReports(user); }

  @SelfService()
  @Post('bookings/:id/documents')
  uploadDoc(@Param('id') id: string, @Body() body: RadiologyDocumentDto, @CurrentUser() user: any) {
    return this.svc.addDocument(id, user, body);
  }

  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Patch('bookings/:id/insurance')
  updateIns(@Param('id') id: string, @Body() body: UpdateInsDto, @CurrentUser() user: any) {
    return this.svc.updateInsuranceStatus(id, user, body.status, body.reason);
  }

  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('provider/inbox')
  providerInbox(@Query('status') st: string | undefined, @CurrentUser() user: any) {
    return this.svc.listForProvider(user, st);
  }

  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/assign-technician')
  assignTech(@Param('id') id: string, @Body() body: AssignTechDto, @CurrentUser() user: any) {
    return this.svc.assignTechnician(id, user, body || {});
  }

  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/upload-report')
  uploadReport(@Param('id') id: string, @Body() body: UploadReportDto, @CurrentUser() user: any) {
    return this.svc.uploadReport(id, user, body || {});
  }

  // --- PILLAR 5: Check-In & Scanning Workflow ---
  // center staff only (the patient never checks in or aborts a scan from the app)
  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
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
  // center staff only (the patient never checks in or aborts a scan from the app)
  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/abort')
  abortScan(@Param('id') id: string, @Body() body: AbortScanDto, @CurrentUser() user: any) {
    return this.svc.abortScan(id, user, body.reason);
  }

  // MODULE 10: Report Quality Workflow
  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/submit-report-for-review')
  submitForReview(@Param('id') id: string, @Body() body: SubmitReportForReviewDto, @CurrentUser() user: any) {
    return this.svc.submitReportForReview(id, user, body);
  }

  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/approve-report')
  approveReport(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.approveReport(id, user);
  }

  // PILLAR 4: Insurance approval gate (the provider records the insurer's decision)
  @Roles(UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/insurance-approval')
  insuranceApproval(@Param('id') id: string, @Body() body: InsuranceApprovalDto, @CurrentUser() user: any) {
    return this.svc.processInsuranceApproval(id, user, body);
  }

  // MODULE 14: Rebooking after abort/cancel
  @Roles(UserRole.PATIENT, UserRole.RADIOLOGY, UserRole.HOSPITAL, UserRole.ADMIN)
  @Patch('bookings/:id/reschedule')
  reschedule(@Param('id') id: string, @Body() body: RescheduleDto, @CurrentUser() user: any) {
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
  catalogDeltaRequest(@Body() body: CatalogDeltaRequestDto, @CurrentUser() user: any) {
    return this.svc.catalogDeltaRequest(user, body);
  }

  // MODULE 12: Preparation confirmed by patient
  @SelfService()
  @Post('bookings/:id/confirm-preparation')
  confirmPrep(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.confirmPreparation(id, user);
  }

  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
  @Get('admin/catalog')
  adminCatalog(@CurrentUser() u: any) { return this.svc.adminCatalog(u); }

  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_CREATE)
  @Post('admin/catalog')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  createCatalog(@CurrentUser() u: any, @Body() b: CreateRadiologyCatalogDto) {
    return this.svc.createCatalog(u, b);
  }

  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_UPDATE)
  @Put('admin/catalog/:id')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  updateCatalog(@CurrentUser() u: any, @Param('id') id: string, @Body() b: UpdateRadiologyCatalogDto) {
    return this.svc.updateCatalog(u, id, b);
  }

  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_DELETE_RESTORE)
  @Delete('admin/catalog/:id')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  deleteCatalog(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deleteCatalog(u, id);
  }

  // P6.0: medical-review decision (approve surfaces the item publicly).
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_UPDATE)
  @Post('admin/catalog/:id/approve')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  approveCatalog(@CurrentUser() u: any, @Param('id') id: string, @Body() b: ApproveCatalogDto) {
    return this.svc.approveCatalogItem(u, id, b.approve !== false);
  }

  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_UPDATE)
  @Post('admin/catalog/bulk-approve')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  bulkApproveCatalog(@CurrentUser() u: any, @Body() b: BulkApproveCatalogDto) {
    return this.svc.bulkApproveCatalog(u, b.ids, b.approve !== false);
  }

  // --- Admin Quality Control & Dispute Intervention ---
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ORDER_REASSIGN)
  @Patch('admin/bookings/:id/force-state')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  forceState(@CurrentUser() u: any, @Param('id') id: string, @Body() b: ForceStateDto) {
    return this.svc.adminForceState(u, id, b.state, b.note);
  }
}
