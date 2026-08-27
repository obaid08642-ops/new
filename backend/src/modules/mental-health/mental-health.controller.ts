import { JwtAuthGuard } from '../../common/auth.guard';
import { Body, Controller, Delete, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MentalHealthService } from './mental-health.service';

@ApiTags('Mental Health – الصحة النفسية')
@UseGuards(JwtAuthGuard)
@Controller('mental-health')
export class MentalHealthController {
  constructor(private readonly mentalHealthService: MentalHealthService) {}

  private patientId(req: any): string {
    const userId = req?.user?.id;
    if (typeof userId !== 'string' || !userId.trim()) {
      throw new UnauthorizedException('المصادقة مطلوبة / Authentication is required');
    }
    return userId;
  }

  /** POST /api/v1/mental-health/mood — self-reported mood, not a diagnosis */
  @Post('mood')
  @ApiOperation({ summary: 'Log a self-reported mood entry / تسجيل مزاج مُبلّغ عنه ذاتياً' })
  logMood(@Req() req: any, @Body() body: any) {
    return this.mentalHealthService.logMood(this.patientId(req), body);
  }

  /** GET /api/v1/mental-health/mood?days=30 — patient-owned mood history */
  @Get('mood')
  @ApiOperation({ summary: 'Get self-reported mood history / سجل المزاج المُبلّغ عنه ذاتياً' })
  getMoodHistory(@Req() req: any, @Query('days') days?: string) {
    return this.mentalHealthService.getMoodHistory(this.patientId(req), days === undefined ? 30 : Number(days));
  }

  @Get('mood/stats')
  @ApiOperation({ summary: 'Get descriptive mood statistics without clinical interpretation / إحصاءات وصفية للمزاج دون تفسير سريري' })
  getMoodStats(@Req() req: any) {
    return this.mentalHealthService.getMoodStats(this.patientId(req));
  }

  @Post('meditation')
  @ApiOperation({ summary: 'Log an optional mindfulness practice / تسجيل ممارسة يقظة ذهنية اختيارية' })
  logMeditation(@Req() req: any, @Body() body: any) {
    return this.mentalHealthService.logMeditation(this.patientId(req), body);
  }

  @Get('meditation')
  @ApiOperation({ summary: 'Get mindfulness practice history / سجل ممارسات اليقظة الذهنية' })
  getMeditationHistory(@Req() req: any) {
    return this.mentalHealthService.getMeditationHistory(this.patientId(req));
  }

  @Get('meditation/stats')
  @ApiOperation({ summary: 'Get optional practice totals / إجماليات الممارسة الاختيارية' })
  getMeditationStats(@Req() req: any) {
    return this.mentalHealthService.getMeditationStats(this.patientId(req));
  }

  @Post('breathing')
  @ApiOperation({ summary: 'Log a breathing practice / تسجيل ممارسة تنفّس' })
  logBreathing(@Req() req: any, @Body() body: any) {
    return this.mentalHealthService.logBreathing(this.patientId(req), body);
  }

  @Get('breathing')
  @ApiOperation({ summary: 'Get breathing practice history / سجل ممارسات التنفس' })
  getBreathingHistory(@Req() req: any) {
    return this.mentalHealthService.getBreathingHistory(this.patientId(req));
  }

  /** No self-assessment endpoint: the service does not score or diagnose mental-health conditions. */

  @Get('crisis-contacts')
  @ApiOperation({ summary: 'Get personal crisis contacts / جهات المساعدة الشخصية' })
  getCrisisContacts(@Req() req: any) {
    return this.mentalHealthService.getCrisisContacts(this.patientId(req));
  }

  @Post('crisis-contacts')
  @ApiOperation({ summary: 'Add a personal crisis contact / إضافة جهة مساعدة شخصية' })
  addCrisisContact(@Req() req: any, @Body() body: any) {
    return this.mentalHealthService.addCrisisContact(this.patientId(req), body);
  }

  @Delete('crisis-contacts/:id')
  @ApiOperation({ summary: 'Delete a personal crisis contact / حذف جهة مساعدة شخصية' })
  deleteCrisisContact(@Req() req: any, @Param('id') id: string) {
    return this.mentalHealthService.deleteCrisisContact(this.patientId(req), id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get the non-diagnostic wellbeing dashboard / لوحة دعم ذاتي غير تشخيصية' })
  getDashboard(@Req() req: any) {
    return this.mentalHealthService.getDashboard(this.patientId(req));
  }
}
