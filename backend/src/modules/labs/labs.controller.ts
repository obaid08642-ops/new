import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { LabsService } from './labs.service';
import { Public, CurrentUser, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { BookDto, TransitionDto, UploadDocDto, UpdateInsDto, OptInCashDto, AssignTechDto, UploadReportDto, RescheduleDto, UpdateGpsDto, DeclareEmergencyDto, RegisterSampleDto, ForceStateDto, UpdateStageDto} from './labs.dto';
import { CreateLabCatalogDto, UpdateLabCatalogDto, ApproveCatalogDto, BulkApproveCatalogDto } from './labs.dto';

import { Permission, RequirePermissions } from '../../common/permissions';
@Controller('labs')
export class LabsController {
  constructor(private readonly svc: LabsService) {}

  @Public() @Get('services')
  services(
    @Query('category') cat?: string, 
    @Query('search') q?: string, 
    @Query('home_only') ho?: string,
    @Query('home_visit') hv?: string,
    @Query('highest_rated') hr?: string,
    @Query('nearest') nr?: string,
    @Query('lowest_price') lp?: string
  ) {
    return this.svc.list({ 
      category: cat, 
      search: q, 
      home_only: ho === '1' || hv === 'true' || hv === '1',
      highest_rated: hr === 'true' || hr === '1',
      nearest: nr === 'true' || nr === '1',
      lowest_price: lp === 'true' || lp === '1'
    });
  }

  @Public() @Get('packages')
  packages() { return this.svc.list({ packages_only: true }); }

  @Public() @Get('categories')
  categories() { return this.svc.categoryCounts(); }

  @Public() @Get('services/:id')
  one(@Param('id') id: string) { return this.svc.getById(id); }

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

  @Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Patch('bookings/:id/state')
  transition(@Param('id') id: string, @Body() body: TransitionDto, @CurrentUser() user: any) {
    return this.svc.transition(id, body.state, user, body.note);
  }

  @SelfService()
  @Post('bookings/:id/documents')
  uploadDoc(@Param('id') id: string, @Body() body: UploadDocDto, @CurrentUser() user: any) {
    return this.svc.addDocument(id, user, body);
  }

  @Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Patch('bookings/:id/insurance')
  updateIns(@Param('id') id: string, @Body() body: UpdateInsDto, @CurrentUser() user: any) {
    return this.svc.updateInsuranceApproval(id, body, user);
  }

  @SelfService()
  @Patch('bookings/:id/items/:serviceId/opt-in-cash')
  optInCash(@Param('id') id: string, @Param('serviceId') serviceId: string, @Body() body: OptInCashDto, @CurrentUser() user: any) {
    return this.svc.optInCash(id, serviceId, body, user);
  }

  @Get('provider/inbox')
  providerInbox(@Query('status') st: string | undefined, @CurrentUser() user: any) {
    return this.svc.listForProvider(user, st);
  }

  @Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/assign-technician')
  assignTech(@Param('id') id: string, @Body() body: AssignTechDto, @CurrentUser() user: any) {
    return this.svc.assignTechnician(id, user, body || {});
  }

  /** R7-3: the lab's real technicians (linked staff accounts) for assignment. */
  @Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Get('team/technicians')
  technicians(@CurrentUser() user: any) {
    return this.svc.listTechnicians(user);
  }

  @Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/upload-report')
  uploadReport(@Param('id') id: string, @Body() body: UploadReportDto, @CurrentUser() user: any) {
    return this.svc.uploadReport(id, user, body || {});
  }

  // --- Addendum Endpoints ---
  @Roles(UserRole.PATIENT, UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Patch('bookings/:id/reschedule')
  reschedule(@Param('id') id: string, @Body() body: RescheduleDto, @CurrentUser() user: any) {
    return this.svc.rescheduleBooking(id, user, body);
  }

  @Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/gps')
  updateGps(@Param('id') id: string, @Body() body: UpdateGpsDto, @CurrentUser() user: any) {
    return this.svc.updateGps(id, user, body);
  }

  @Get('bookings/:id/tracking')
  getTracking(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getTracking(id, user);
  }

  @Roles(UserRole.PATIENT, UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/emergency')
  declareEmergency(@Param('id') id: string, @Body() body: DeclareEmergencyDto, @CurrentUser() user: any) {
    return this.svc.declareEmergency(id, user, body);
  }

  @Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('bookings/:id/reassign')
  reassign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.reassign(id, user);
  }

  @Get('admin/all')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  adminAll(@Query() q: any, @CurrentUser() u: any) {
    return this.svc.adminListAll({ 
      status: q.status, 
      insurance_status: q.insurance_status, 
      location_type: q.location_type, 
      delayed_only: q.delayed_only,
      disputed_only: q.disputed_only,
      limit: q.limit ? parseInt(q.limit, 10) : undefined 
    }, u);
  }

  @Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('samples/register')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  registerSample(@CurrentUser() u: any, @Body() b: RegisterSampleDto) {
    return this.svc.registerSample(u, b);
  }

  @Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Patch('samples/:id/stage')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  updateStage(@CurrentUser() u: any, @Param('id') id: string, @Body() b: UpdateStageDto) {
    return this.svc.updateSampleStage(u, id, b.stage, b.notes);
  }

  @Get('samples')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  listSamples(@CurrentUser() u: any) {
    return this.svc.listSamples(u);
  }

  // --- Admin Catalog CRUD ---
  @Roles(UserRole.ADMIN)
  @Roles(UserRole.ADMIN)
  @Get('admin/catalog')
  adminCatalog(@CurrentUser() u: any) { return this.svc.adminCatalog(u); }

  @RequirePermissions(Permission.CATALOG_CREATE)
  @Post('admin/catalog')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  createCatalog(@CurrentUser() u: any, @Body() b: CreateLabCatalogDto) {
    return this.svc.createCatalog(u, b);
  }

  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_UPDATE)
  @Put('admin/catalog/:id')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  updateCatalog(@CurrentUser() u: any, @Param('id') id: string, @Body() b: UpdateLabCatalogDto) {
    return this.svc.updateCatalog(u, id, b);
  }

  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_DELETE_RESTORE)
  @Delete('admin/catalog/:id')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  deleteCatalog(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deleteCatalog(u, id);
  }

  // P6.0: medical-review decision (approve surfaces the item publicly).
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_UPDATE)
  @Post('admin/catalog/:id/approve')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  approveCatalog(@CurrentUser() u: any, @Param('id') id: string, @Body() b: ApproveCatalogDto) {
    return this.svc.approveCatalogItem(u, id, b.approve !== false);
  }

  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_UPDATE)
  @Post('admin/catalog/bulk-approve')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  bulkApproveCatalog(@CurrentUser() u: any, @Body() b: BulkApproveCatalogDto) {
    return this.svc.bulkApproveCatalog(u, b.ids, b.approve !== false);
  }

  // --- Admin Quality Control & Dispute Intervention ---
  @Roles(UserRole.ADMIN)
  @Patch('admin/bookings/:id/force-state')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  forceState(@CurrentUser() u: any, @Param('id') id: string, @Body() b: ForceStateDto) {
    return this.svc.adminForceState(u, id, b.state, b.note);
  }

  @Public() @Get('packages/:id')
  getPackageDetails(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Public() @Get('compatible-providers')
  compatibleProviders(@Query('testIds') testIds?: string) {
    const ids = testIds ? testIds.split(',') : [];
    return this.svc.compatibleProviders(ids);
  }

  @Public() @Get('providers/:providerAccountId/slots')
  providerSlots(
    @Param('providerAccountId') providerAccountId: string,
    @Query('date') date: string,
    @Query('duration') duration?: string
  ) {
    const dur = duration ? parseInt(duration, 10) : 30;
    return this.svc.slotsForProvider(providerAccountId, date, dur);
  }
}
