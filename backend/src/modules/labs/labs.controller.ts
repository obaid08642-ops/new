import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LabsService } from './labs.service';
import { Public, CurrentUser } from '../../common/auth.guard';

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

  @Post('bookings')
  book(@Body() body: any, @CurrentUser() user: any) { return this.svc.book(user, body); }

  @Get('bookings/mine')
  mine(@CurrentUser() user: any) { return this.svc.mineFor(user); }

  @Get('bookings/:id')
  oneBooking(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.getBooking(id, user); }

  @Post('bookings/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.cancel(id, user); }

  @Patch('bookings/:id/state')
  transition(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.transition(id, body.state, user, body.note);
  }

  @Post('bookings/:id/documents')
  uploadDoc(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.addDocument(id, user, body);
  }

  @Patch('bookings/:id/insurance')
  updateIns(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateInsuranceApproval(id, body, user);
  }

  @Patch('bookings/:id/items/:serviceId/opt-in-cash')
  optInCash(@Param('id') id: string, @Param('serviceId') serviceId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.optInCash(id, serviceId, body, user);
  }

  @Get('provider/inbox')
  providerInbox(@Query('status') st: string | undefined, @CurrentUser() user: any) {
    return this.svc.listForProvider(user, st);
  }

  @Post('bookings/:id/assign-technician')
  assignTech(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.assignTechnician(id, user, body || {});
  }

  @Post('bookings/:id/upload-report')
  uploadReport(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.uploadReport(id, user, body || {});
  }

  // --- Addendum Endpoints ---
  @Patch('bookings/:id/reschedule')
  reschedule(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.rescheduleBooking(id, user, body);
  }

  @Post('bookings/:id/gps')
  updateGps(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateGps(id, user, body);
  }

  @Get('bookings/:id/tracking')
  getTracking(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getTracking(id, user);
  }

  @Post('bookings/:id/emergency')
  declareEmergency(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.declareEmergency(id, user, body);
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

  @Post('samples/register')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  registerSample(@CurrentUser() u: any, @Body() b: any) {
    return this.svc.registerSample(u, b);
  }

  @Patch('samples/:id/stage')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  updateStage(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { stage: any; notes?: string }) {
    return this.svc.updateSampleStage(u, id, b.stage, b.notes);
  }

  @Get('samples')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  listSamples(@CurrentUser() u: any) {
    return this.svc.listSamples(u);
  }

  // --- Admin Catalog CRUD ---
  @Post('admin/catalog')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  createCatalog(@CurrentUser() u: any, @Body() b: any) {
    return this.svc.createCatalog(u, b);
  }

  @Put('admin/catalog/:id')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  updateCatalog(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateCatalog(u, id, b);
  }

  @Delete('admin/catalog/:id')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  deleteCatalog(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deleteCatalog(u, id);
  }

  // --- Admin Quality Control & Dispute Intervention ---
  @Patch('admin/bookings/:id/force-state')
  @UseGuards(require('../../common/auth.guard').JwtAuthGuard)
  forceState(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
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
}
