import { Body, Controller, Get, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth.guard';
import { NutritionService } from './nutrition.service';

@ApiTags('Nutrition | التغذية')
@UseGuards(JwtAuthGuard)
@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  private authenticatedPatientId(req: any): string {
    const userId = req?.user?.id;
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new UnauthorizedException('authenticated_patient_required');
    }
    return userId;
  }

  /* ───────── Profile ───────── */
  @ApiOperation({ summary: 'Get nutrition profile | الحصول على الملف الغذائي' })
  @Get('profile')
  getProfile(@Req() req: any) {
    return this.nutritionService.getProfile(this.authenticatedPatientId(req));
  }

  @ApiOperation({ summary: 'Update nutrition profile | تحديث الملف الغذائي' })
  @Post('profile')
  updateProfile(@Req() req: any, @Body() body: any) {
    return this.nutritionService.updateProfile(this.authenticatedPatientId(req), body);
  }

  /* ───────── Meals ───────── */
  @ApiOperation({ summary: 'Log a meal | تسجيل وجبة' })
  @Post('meals')
  logMeal(@Req() req: any, @Body() body: any) {
    return this.nutritionService.logMeal(this.authenticatedPatientId(req), body);
  }

  @ApiOperation({ summary: 'Get meal history | سجل الوجبات' })
  @Get('meals')
  getMealHistory(@Req() req: any, @Query('date') date?: string) {
    return this.nutritionService.getMealHistory(this.authenticatedPatientId(req), date);
  }

  /* ───────── Daily Summary ───────── */
  @ApiOperation({ summary: 'Get daily nutrition summary | ملخص التغذية اليومي' })
  @Get('daily-summary')
  getDailySummary(@Req() req: any, @Query('date') date?: string) {
    return this.nutritionService.getDailySummary(this.authenticatedPatientId(req), date);
  }

  /* ───────── Water ───────── */
  @ApiOperation({ summary: 'Log water intake | تسجيل شرب الماء' })
  @Post('water')
  logWater(@Req() req: any, @Body() body: { amount_ml: number }) {
    return this.nutritionService.logWater(this.authenticatedPatientId(req), body.amount_ml);
  }

  @ApiOperation({ summary: 'Get water history | سجل شرب الماء' })
  @Get('water')
  getWaterHistory(@Req() req: any, @Query('date') date?: string) {
    return this.nutritionService.getWaterHistory(this.authenticatedPatientId(req), date);
  }

  /* ───────── Exercise ───────── */
  @ApiOperation({ summary: 'Log exercise | تسجيل تمرين' })
  @Post('exercise')
  logExercise(@Req() req: any, @Body() body: any) {
    return this.nutritionService.logExercise(this.authenticatedPatientId(req), body);
  }

  @ApiOperation({ summary: 'Get exercise history | سجل التمارين' })
  @Get('exercise')
  getExerciseHistory(@Req() req: any, @Query('date') date?: string) {
    return this.nutritionService.getExerciseHistory(this.authenticatedPatientId(req), date);
  }

  /* ───────── Weekly Report ───────── */
  @ApiOperation({ summary: 'Get weekly nutrition report | تقرير التغذية الأسبوعي' })
  @Get('weekly-report')
  getWeeklyReport(@Req() req: any) {
    return this.nutritionService.getWeeklyReport(this.authenticatedPatientId(req));
  }
}
