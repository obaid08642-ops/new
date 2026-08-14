import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { ProviderType, ProviderStatus, UserRole } from '../../common/enums';

@Controller('providers')
@UseGuards(JwtAuthGuard)
export class ProvidersController {
  constructor(private svc: ProvidersService) {}

  /** Public self-registration */
  @Public()
  @Post('apply')
  apply(@Body() body: any) {
    return this.svc.apply(body);
  }

  /** Public listing for patient app */
  @Public()
  @Get()
  list(
    @Query('type') type: ProviderType,
    @Query('city') city: string,
    @Query('insurance_company') company?: string,
    @Query('insurance_network') network?: string,
    @Query('insurance_class') klass?: string,
  ) {
    return this.svc.listPublic(type, city, company, network, klass);
  }

  @Public()
  @Get(':id')
  one(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  /** My own provider profile */
  @Get('me/profile')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.LAB, UserRole.RADIOLOGY, UserRole.HOME_CARE)
  mine(@CurrentUser('id') id: string) {
    return this.svc.myProfile(id);
  }


  // ============ Delta Audit ============
  @Post('me/delta')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.LAB, UserRole.RADIOLOGY, UserRole.HOME_CARE)
  requestDelta(@CurrentUser('id') id: string, @Body() body: { oldData: any, newData: any }) {
    return this.svc.requestDeltaUpdate(id, body.oldData, body.newData);
  }

  @Get('admin/deltas/pending')
  @Roles(UserRole.ADMIN)
  pendingDeltas() {
    return this.svc.listPendingDeltas();
  }

  @Post('admin/deltas/:id/approve')
  @Roles(UserRole.ADMIN)
  approveDelta(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.svc.approveDelta(id, adminId);
  }

  @Post('admin/deltas/:id/reject')
  @Roles(UserRole.ADMIN)
  rejectDelta(@Param('id') id: string, @CurrentUser('id') adminId: string, @Body() body: { reason: string }) {
    return this.svc.rejectDelta(id, adminId, body.reason);
  }

  // ============ Admin ============

  @Post('admin/create')
  @Roles(UserRole.ADMIN)
  adminCreate(@Body() body: any, @CurrentUser() admin: any) {
    return this.svc.adminCreate(body, admin);
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  adminAll(@Query('type') type: ProviderType, @Query('status') status: ProviderStatus, @Query('search') search: string) {
    return this.svc.listAll(type, status, search);
  }

  @Get('admin/pending')
  @Roles(UserRole.ADMIN)
  pending() {
    return this.svc.listPending();
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.svc.approve(id, admin);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string, @CurrentUser() admin: any, @Body() body: { reason?: string }) {
    return this.svc.reject(id, admin, body?.reason || '');
  }

  @Post(':id/suspend')
  @Roles(UserRole.ADMIN)
  suspend(@Param('id') id: string, @CurrentUser() admin: any, @Body() body: { reason?: string }) {
    return this.svc.suspend(id, admin, body?.reason || '');
  }

  /** Admin: seed sample lab/radiology/home_care/hospital providers (idempotent — skips existing). */
  @Post('admin/seed-demo')
  @Roles(UserRole.ADMIN)
  seedDemo() {
    return this.svc.seedDemoProviders();
  }
}
