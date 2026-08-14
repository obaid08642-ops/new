import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards, BadRequestException, UseInterceptors } from '@nestjs/common';
import { NabdExtensionsService } from './nabd-extensions.service';
import { JwtAuthGuard, CurrentUser, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { RedisCacheInterceptor } from '../../common/redis-cache.interceptor';

@Controller()
@UseGuards(JwtAuthGuard)
export class NabdExtensionsController {
  constructor(private readonly svc: NabdExtensionsService) {}

  // ==========================================
  // MODULE 1: EVENT BUS, OPERATIONS & CORE
  // ==========================================

  @Patch('notifications/:id/read')
  async markNotificationRead(@Param('id') id: string, @CurrentUser() user: any) {
    if (id === 'all') {
      return this.svc.logActivity('notifications.read_all', user.id);
    }
    return this.svc.logActivity('notifications.read', user.id, undefined, { notificationId: id });
  }

  @Get('wallet/balance')
  async getWalletBalance(@CurrentUser() user: any) {
    const balance = await this.svc.getWalletBalance(user.id, user.role !== UserRole.PATIENT ? 'provider' : 'patient');
    return { balance };
  }

  @Post('wallet/credit')
  async creditWallet(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.processWalletTransaction({
      ownerId: user.id,
      ownerType: user.role !== UserRole.PATIENT ? 'provider' : 'patient',
      amount: body.amount,
      type: 'credit',
      referenceType: body.referenceType || 'booking',
      referenceId: body.referenceId || 'manual',
      description: body.description || 'Manual Wallet Credit',
    });
  }

  @Post('wallet/debit')
  async debitWallet(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.processWalletTransaction({
      ownerId: user.id,
      ownerType: user.role !== UserRole.PATIENT ? 'provider' : 'patient',
      amount: body.amount,
      type: 'debit',
      referenceType: body.referenceType || 'booking',
      referenceId: body.referenceId || 'manual',
      description: body.description || 'Manual Wallet Debit',
    });
  }

  @Post('referral/code')
  async getReferralCode(@CurrentUser() user: any) {
    const code = await this.svc.generateReferralCode(user.id);
    return { code };
  }

  @Post('referral/claim')
  async claimReferral(@CurrentUser() user: any, @Body() body: { code: string }) {
    if (!body.code) throw new BadRequestException('Referral code is required');
    return this.svc.claimReferral(user.id, body.code);
  }

  @Public()
  @Get('config/flags')
  async getFlags() {
    return this.svc.getFlags();
  }

  @Put('admin/config/flags')
  @Roles(UserRole.ADMIN)
  async updateFlag(@CurrentUser() admin: any, @Body() body: { flagName: string; isEnabled: boolean }) {
    if (!body.flagName) throw new BadRequestException('flagName is required');
    return this.svc.updateFlag(body.flagName, body.isEnabled, admin.id);
  }

  // ==========================================
  // MODULE 2: MEDICAL, PATHWAYS & DIAGNOSTICS
  // ==========================================

  @Get('patients/timeline')
  async getTimeline(@CurrentUser() user: any) {
    return this.svc.getTimeline(user.id);
  }

  @Get('patients/passport')
  async getPassport(@CurrentUser() user: any) {
    return this.svc.getHealthPassport(user.id);
  }

  @Post('medical/programs/enroll')
  async enrollProgram(@CurrentUser() user: any, @Body() body: { programType: 'diabetes' | 'hypertension' | 'pregnancy' }) {
    if (!body.programType) throw new BadRequestException('programType is required');
    return this.svc.enrollProgram(user.id, body.programType);
  }

  @Get('medical/programs/active')
  async getActivePrograms(@CurrentUser() user: any) {
    return this.svc.getActivePrograms(user.id);
  }

  @Post('medical/programs/complete-session')
  async completeSession(@CurrentUser() user: any, @Body() body: { programType: string; sessionId: string }) {
    if (!body.programType || !body.sessionId) throw new BadRequestException('programType and sessionId are required');
    return this.svc.completeProgramSession(user.id, body.programType, body.sessionId);
  }

  // ==========================================
  // MODULE 3: PROVIDER PERFORMANCE & MATCHING
  // ==========================================

  @Post('provider/match/pharmacy')
  async matchPharmacy(@Body() body: { lat: number; lng: number; requiredMedName?: string }) {
    return this.svc.matchPharmacy(body.lat, body.lng, body.requiredMedName || '');
  }

  @Post('provider/match/nurse')
  async matchNurse(@Body() body: { lat: number; lng: number }) {
    return this.svc.matchNurse(body.lat, body.lng);
  }

  @Get('provider/rankings')
  @UseInterceptors(RedisCacheInterceptor)
  async getProviderRankings(@Query('lat') lat: string, @Query('lng') lng: string, @Query('type') type: string) {
    return this.svc.rankProviders(parseFloat(lat), parseFloat(lng), type || 'pharmacy');
  }

  @Get('provider/fraud-alerts')
  @Roles(UserRole.ADMIN)
  async getFraudAlerts() {
    return this.svc.detectFraud();
  }

  // ==========================================
  // MODULE 4: NURSE, PHARMACY & LAB WORKFLOWS
  // ==========================================

  @Post('nursing/attendance/verify')
  async verifyNurseAttendance(@CurrentUser() nurse: any, @Body() body: { visitId: string; lat: number; lng: number }) {
    return this.svc.verifyNurseAttendance(nurse.id, body.visitId, body.lat, body.lng);
  }

  @Get('nursing/visit/checklist')
  async getNursingChecklist(@Query('visitId') visitId: string) {
    return this.svc.getNursingChecklist(visitId);
  }

  @Post('pharmacy/broadcast/respond')
  async respondToBroadcast(@CurrentUser() provider: any, @Body() body: any) {
    await this.svc.logActivity('pharmacy.broadcast.response', undefined, provider.id, body);
    return { success: true, message: 'Response submitted successfully' };
  }

  @Get('pharmacy/inventory/expiry')
  async getExpiringInventory() {
    return this.svc.getExpiringInventory();
  }

  @Post('labs/samples/barcode-verify')
  async verifyBarcode(@CurrentUser() staff: any, @Body() body: { sampleId: string; barcodeId: string }) {
    await this.svc.logActivity('lab.sample.barcode_bound', undefined, staff.id, body);
    return { success: true, message: 'Barcode bound successfully to sample ID' };
  }

  @Post('labs/results/verify')
  async verifyLabResults(@Body() body: { sampleId: string; actualValue: number }) {
    return this.svc.verifyLabResultRanges(body.sampleId, body.actualValue);
  }

  // ==========================================
  // MODULE 5: ANALYTICS, ADS & CORPORATES
  // ==========================================

  @Get('admin/analytics/heatmaps')
  @Roles(UserRole.ADMIN)
  async getHeatmaps() {
    return this.svc.getHeatmaps();
  }

  @Post('admin/ads/bid')
  async placeAdBid(@CurrentUser() provider: any, @Body() body: any) {
    await this.svc.logActivity('ads.bid_placed', undefined, provider.id, body);
    return { success: true, message: 'Ad Bid placed successfully' };
  }

  @Post('corporate/enroll')
  async enrollCorporate(@CurrentUser() user: any, @Body() body: { companyName: string; employeeId: string; requestedAmount: number }) {
    return this.svc.verifyCorporateCredit(body.companyName, body.employeeId, body.requestedAmount);
  }
}
