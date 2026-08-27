import { JwtAuthGuard } from '../../common/auth.guard';
import { Body, Controller, Get, Param, Post, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { MaternityService } from './maternity.service';

@UseGuards(JwtAuthGuard)
@Controller('maternity')
export class MaternityController {
  constructor(private readonly maternityService: MaternityService) {}

  private authenticatedPatientId(req: any): string {
    const userId = req?.user?.id;
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new UnauthorizedException('authenticated_patient_required');
    }
    return userId;
  }

  /** GET /api/v1/maternity/profile — Get active pregnancy parameters and logs */
  @Get('profile')
  getProfile(@Req() req: any) {
    return this.maternityService.getProfile(this.authenticatedPatientId(req));
  }

  @Get('content')
  getContent() {
    return this.maternityService.getContent();
  }

  /** POST /api/v1/maternity/profile — Set or update maternity/pregnancy profile variables */
  @Post('profile')
  updateProfile(@Req() req: any, @Body() body: any) {
    return this.maternityService.updateProfile(this.authenticatedPatientId(req), body);
  }

  /** POST /api/v1/maternity/kicks — Log a kick count session */
  @Post('kicks')
  logKick(@Req() req: any, @Body() body: { count: number; duration_seconds: number }) {
    return this.maternityService.logKick(this.authenticatedPatientId(req), body.count, body.duration_seconds);
  }

  /** POST /api/v1/maternity/contractions — Log a contraction record */
  @Post('contractions')
  logContraction(@Req() req: any, @Body() body: { interval_seconds: number; duration_seconds: number }) {
    return this.maternityService.logContraction(this.authenticatedPatientId(req), body.interval_seconds, body.duration_seconds);
  }

  /** PUT /api/v1/maternity/checkups/:week/toggle — Mark checkup status as done/undone */
  @Put('checkups/:week/toggle')
  toggleCheckup(@Req() req: any, @Param('week') week: string) {
    return this.maternityService.toggleCheckup(this.authenticatedPatientId(req), week);
  }

  /** POST /api/v1/maternity/infant-growth — Log baby growth metrics */
  @Post('infant-growth')
  logInfantGrowth(@Req() req: any, @Body() body: { month: number; weight_kg?: number; height_cm?: number; head_circ_cm?: number }) {
    return this.maternityService.logInfantGrowth(this.authenticatedPatientId(req), body);
  }
}
