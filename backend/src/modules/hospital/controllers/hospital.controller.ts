import { Controller, Post, Get, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { HospitalService } from '../services/hospital.service';
import { JwtAuthGuard, CurrentUser } from '../../../common/auth.guard';

@Controller('hospital')
@UseGuards(JwtAuthGuard)
export class HospitalController {
  constructor(private readonly hospitalService: HospitalService) {}

  @Post('branches')
  async createBranch(@CurrentUser() user: any, @Body() body: any) {
    return this.hospitalService.createBranch(user.id, body, user);
  }

  @Get('branches')
  async getBranches(@CurrentUser() user: any) {
    return this.hospitalService.getBranches(user.id, user);
  }

  @Post('departments')
  async createDepartment(@CurrentUser() user: any, @Body() body: any) {
    return this.hospitalService.createDepartment(user.id, body, user);
  }

  @Get('departments')
  async getDepartments(@CurrentUser() user: any) {
    return this.hospitalService.getDepartments(user.id, user);
  }

  @Post('staff')
  async addStaff(@CurrentUser() user: any, @Body() body: any) {
    return this.hospitalService.addStaff(user.id, body, user);
  }

  @Get('staff')
  async getStaff(@CurrentUser() user: any) {
    return this.hospitalService.getStaff(user.id, user);
  }

  @Post('doctors/onboard')
  async onboardDoctor(@CurrentUser() user: any, @Body() body: { doctor_id: string }) {
    return this.hospitalService.onboardDoctor(user.id, body.doctor_id, user);
  }

  @Get('appointments')
  async getAppointments(@CurrentUser() user: any, @Query('branch_id') branchId?: string) {
    // Determine the hospital ID. If the user is an admin, it's their ID.
    // If the user is a receptionist, we'd look up their hospital_id. 
    // For this demonstration of RBAC, we assume user.id resolves correctly based on their token.
    return this.hospitalService.getUnifiedAppointments(user.id, branchId, user);
  }

  @Put('appointments/:id/status')
  async updateAppointmentStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { status: string }) {
    return this.hospitalService.updateAppointmentStatus(user.id, id, body.status, user);
  }

  @Get('wallet')
  async getWallet(@CurrentUser() user: any) {
    // Pass user.role to the service to enforce RBAC (Receptionist gets denied)
    return this.hospitalService.getAggregatedWallet(user.id, user.role, user);
  }

  // ── Facility → provider invitations ───────────────────────────────────────

  @Post('invitations')
  async createInvitation(@CurrentUser() user: any, @Body() body: { identifier?: string; role?: string; permissions?: Record<string, boolean> }) {
    return this.hospitalService.createInvitation(user.id, body);
  }

  @Get('invitations')
  async listFacilityInvitations(@CurrentUser() user: any) {
    return this.hospitalService.listFacilityInvitations(user.id);
  }

  @Get('invitations/inbox')
  async listMyInvitations(@CurrentUser() user: any) {
    return this.hospitalService.listMyInvitations(user.id);
  }

  @Post('invitations/:id/respond')
  async respondInvitation(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { accept?: boolean }) {
    return this.hospitalService.respondInvitation(user.id, id, !!body?.accept);
  }

  @Post('leave-facility')
  async leaveFacility(@CurrentUser() user: any) {
    return this.hospitalService.leaveFacility(user.id);
  }
}
