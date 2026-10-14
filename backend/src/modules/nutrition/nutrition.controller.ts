import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, NoGuestsGuard, SelfService } from '../../common/auth.guard';
import { AiUserQuotaGuard } from '../ai/ai-user-quota.guard';
import { NutritionPlanService } from './nutrition-plan.service';
import { NutritionService } from './nutrition.service';
import { UpdateProfileDto, LogMealDto, LogExerciseDto, LogWaterDto} from './nutrition.dto';

@ApiTags('Nutrition | التغذية')
@UseGuards(JwtAuthGuard)
@Controller('nutrition')
@SelfService()
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService, private readonly plans: NutritionPlanService) {}

  private authenticatedPatientId(req: any): string {
    const userId = req?.user?.id;
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new UnauthorizedException('authenticated_patient_required');
    }
    return userId;
  }

  /* ───────── AI plan (owner decision 2026-10-05) ───────── */
  @ApiOperation({ summary: 'My latest AI nutrition plan (204 when none) | خطتي الغذائية' })
  @Get('plan')
  async getPlan(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const plan = await this.plans.latest(this.authenticatedPatientId(req));
    if (!plan) { res.status(204); return undefined; }
    return plan;
  }

  @ApiOperation({ summary: 'Generate my AI nutrition plan from my profile | إنشاء خطة غذائية' })
  @UseGuards(NoGuestsGuard, AiUserQuotaGuard)
  @HttpCode(201)
  @Post('plan/generate')
  generatePlan(@Req() req: any) {
    return this.plans.generate(this.authenticatedPatientId(req));
  }

  /* ───────── Profile ───────── */
  @ApiOperation({ summary: 'Get nutrition profile | الحصول على الملف الغذائي' })
  @Get('profile')
  getProfile(@Req() req: any) {
    return this.nutritionService.getProfile(this.authenticatedPatientId(req));
  }

  @ApiOperation({ summary: 'Update nutrition profile | تحديث الملف الغذائي' })
  @Post('profile')
  updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    return this.nutritionService.updateProfile(this.authenticatedPatientId(req), body);
  }

  /* ───────── Meals ───────── */
  @ApiOperation({ summary: 'Log a meal | تسجيل وجبة' })
  @Post('meals')
  logMeal(@Req() req: any, @Body() body: LogMealDto) {
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
  logWater(@Req() req: any, @Body() body: LogWaterDto) {
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
  logExercise(@Req() req: any, @Body() body: LogExerciseDto) {
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
