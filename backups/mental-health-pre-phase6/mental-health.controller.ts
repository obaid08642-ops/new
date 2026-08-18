import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MentalHealthService } from './mental-health.service';

@ApiTags('Mental Health – الصحة النفسية')
@UseGuards(JwtAuthGuard)
@Controller('mental-health')
export class MentalHealthController {
  constructor(private readonly mentalHealthService: MentalHealthService) {}

  /* ───── Mood ───── */

  /** POST /api/v1/mental-health/mood — Log a mood entry */
  @Post('mood')
  @ApiOperation({ summary: 'Log mood entry / تسجيل الحالة المزاجية' })
  logMood(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.logMood(userId, body);
  }

  /** GET /api/v1/mental-health/mood?days=30 — Mood history */
  @Get('mood')
  @ApiOperation({ summary: 'Get mood history / سجل الحالة المزاجية' })
  getMoodHistory(@Req() req: any, @Query('days') days?: string) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.getMoodHistory(
      userId,
      days ? parseInt(days, 10) : 30,
    );
  }

  /** GET /api/v1/mental-health/mood/stats — Mood statistics */
  @Get('mood/stats')
  @ApiOperation({ summary: 'Mood statistics / إحصائيات المزاج' })
  getMoodStats(@Req() req: any) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.getMoodStats(userId);
  }

  /* ───── Meditation ───── */

  /** POST /api/v1/mental-health/meditation — Log meditation session */
  @Post('meditation')
  @ApiOperation({ summary: 'Log meditation session / تسجيل جلسة تأمل' })
  logMeditation(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.logMeditation(userId, body);
  }

  /** GET /api/v1/mental-health/meditation — Meditation history */
  @Get('meditation')
  @ApiOperation({ summary: 'Meditation history / سجل جلسات التأمل' })
  getMeditationHistory(@Req() req: any) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.getMeditationHistory(userId);
  }

  /** GET /api/v1/mental-health/meditation/stats — Meditation statistics */
  @Get('meditation/stats')
  @ApiOperation({ summary: 'Meditation stats / إحصائيات التأمل' })
  getMeditationStats(@Req() req: any) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.getMeditationStats(userId);
  }

  /* ───── Breathing ───── */

  /** POST /api/v1/mental-health/breathing — Log breathing session */
  @Post('breathing')
  @ApiOperation({ summary: 'Log breathing session / تسجيل جلسة تنفس' })
  logBreathing(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.logBreathing(userId, body);
  }

  /** GET /api/v1/mental-health/breathing — Breathing history */
  @Get('breathing')
  @ApiOperation({ summary: 'Breathing history / سجل جلسات التنفس' })
  getBreathingHistory(@Req() req: any) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.getBreathingHistory(userId);
  }

  /* ───── Self-Assessment ───── */

  /** POST /api/v1/mental-health/assessment — Submit self-assessment */
  @Post('assessment')
  @ApiOperation({ summary: 'Submit assessment / إرسال تقييم ذاتي' })
  submitAssessment(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.submitAssessment(userId, body);
  }

  /** GET /api/v1/mental-health/assessment?type=phq9 — Assessment history */
  @Get('assessment')
  @ApiOperation({ summary: 'Assessment history / سجل التقييمات' })
  getAssessmentHistory(@Req() req: any, @Query('type') type?: string) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.getAssessmentHistory(userId, type);
  }

  /* ───── Crisis Contacts ───── */

  /** GET /api/v1/mental-health/crisis-contacts — Get crisis contacts */
  @Get('crisis-contacts')
  @ApiOperation({ summary: 'Get crisis contacts / جهات اتصال الطوارئ' })
  getCrisisContacts(@Req() req: any) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.getCrisisContacts(userId);
  }

  /** POST /api/v1/mental-health/crisis-contacts — Add crisis contact */
  @Post('crisis-contacts')
  @ApiOperation({ summary: 'Add crisis contact / إضافة جهة اتصال' })
  addCrisisContact(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.addCrisisContact(userId, body);
  }

  /** DELETE /api/v1/mental-health/crisis-contacts/:id — Delete crisis contact */
  @Delete('crisis-contacts/:id')
  @ApiOperation({ summary: 'Delete crisis contact / حذف جهة اتصال' })
  deleteCrisisContact(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.deleteCrisisContact(userId, id);
  }

  /* ───── Dashboard ───── */

  /** GET /api/v1/mental-health/dashboard — Combined mental health dashboard */
  @Get('dashboard')
  @ApiOperation({ summary: 'Mental health dashboard / لوحة الصحة النفسية' })
  getDashboard(@Req() req: any) {
    const userId = req.user?.id ?? 'guest';
    return this.mentalHealthService.getDashboard(userId);
  }
}
