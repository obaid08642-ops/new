import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Post, Put, Body, Param, Req } from '@nestjs/common';
import { MaternityService } from './maternity.service';

@UseGuards(JwtAuthGuard)
@Controller('maternity')
export class MaternityController {
  constructor(private readonly maternityService: MaternityService) {}

  /** GET /api/v1/maternity/profile — Get active pregnancy parameters and logs */
  @Get('profile')
  getProfile(@Req() req: any) {
    const userId = req.user?.id ?? 'guest';
    return this.maternityService.getProfile(userId);
  }

  @Get('content')
  getContent() {
    return this.maternityService.getContent();
  }

  /** POST /api/v1/maternity/profile — Set or update maternity/pregnancy profile variables */
  @Post('profile')
  updateProfile(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id ?? 'guest';
    return this.maternityService.updateProfile(userId, body);
  }

  /** POST /api/v1/maternity/kicks — Log a kick count session */
  @Post('kicks')
  logKick(@Req() req: any, @Body() body: { count: number; duration_seconds: number }) {
    const userId = req.user?.id ?? 'guest';
    return this.maternityService.logKick(userId, body.count, body.duration_seconds);
  }

  /** POST /api/v1/maternity/contractions — Log a contraction record */
  @Post('contractions')
  logContraction(@Req() req: any, @Body() body: { interval_seconds: number; duration_seconds: number }) {
    const userId = req.user?.id ?? 'guest';
    return this.maternityService.logContraction(userId, body.interval_seconds, body.duration_seconds);
  }

  /** PUT /api/v1/maternity/checkups/:week/toggle — Mark checkup status as done/undone */
  @Put('checkups/:week/toggle')
  toggleCheckup(@Req() req: any, @Param('week') week: string) {
    const userId = req.user?.id ?? 'guest';
    return this.maternityService.toggleCheckup(userId, week);
  }

  /** POST /api/v1/maternity/infant-growth — Log baby growth metrics */
  @Post('infant-growth')
  logInfantGrowth(@Req() req: any, @Body() body: { month: number; weight_kg?: number; height_cm?: number; head_circ_cm?: number }) {
    const userId = req.user?.id ?? 'guest';
    return this.maternityService.logInfantGrowth(userId, body);
  }
}
