import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';

@ApiTags('Nutrition | التغذية')
@UseGuards(JwtAuthGuard)
@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  /* ───────── Profile ───────── */

  /** GET /api/v1/nutrition/profile — Get nutrition profile */
  @ApiOperation({ summary: 'Get nutrition profile | الحصول على الملف الغذائي' })
  @Get('profile')
  getProfile(@Req() req: any) {
    const userId = req.user?.id ?? 'guest';
    return this.nutritionService.getProfile(userId);
  }

  /** POST /api/v1/nutrition/profile — Update nutrition profile */
  @ApiOperation({ summary: 'Update nutrition profile | تحديث الملف الغذائي' })
  @Post('profile')
  updateProfile(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id ?? 'guest';
    return this.nutritionService.updateProfile(userId, body);
  }

  /* ───────── Meals ───────── */

  /** POST /api/v1/nutrition/meals — Log a meal */
  @ApiOperation({ summary: 'Log a meal | تسجيل وجبة' })
  @Post('meals')
  logMeal(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id ?? 'guest';
    return this.nutritionService.logMeal(userId, body);
  }

  /** GET /api/v1/nutrition/meals?date=YYYY-MM-DD — Get meal history */
  @ApiOperation({ summary: 'Get meal history | سجل الوجبات' })
  @Get('meals')
  getMealHistory(@Req() req: any, @Query('date') date?: string) {
    const userId = req.user?.id ?? 'guest';
    return this.nutritionService.getMealHistory(userId, date);
  }

  /* ───────── Daily Summary ───────── */

  /** GET /api/v1/nutrition/daily-summary?date=YYYY-MM-DD — Aggregated daily summary */
  @ApiOperation({ summary: 'Get daily nutrition summary | ملخص التغذية اليومي' })
  @Get('daily-summary')
  getDailySummary(@Req() req: any, @Query('date') date?: string) {
    const userId = req.user?.id ?? 'guest';
    return this.nutritionService.getDailySummary(userId, date);
  }

  /* ───────── Water ───────── */

  /** POST /api/v1/nutrition/water — Log water intake */
  @ApiOperation({ summary: 'Log water intake | تسجيل شرب الماء' })
  @Post('water')
  logWater(@Req() req: any, @Body() body: { amount_ml: number }) {
    const userId = req.user?.id ?? 'guest';
    return this.nutritionService.logWater(userId, body.amount_ml);
  }

  /** GET /api/v1/nutrition/water?date=YYYY-MM-DD — Get water intake history */
  @ApiOperation({ summary: 'Get water history | سجل شرب الماء' })
  @Get('water')
  getWaterHistory(@Req() req: any, @Query('date') date?: string) {
    const userId = req.user?.id ?? 'guest';
    return this.nutritionService.getWaterHistory(userId, date);
  }

  /* ───────── Exercise ───────── */

  /** POST /api/v1/nutrition/exercise — Log exercise session */
  @ApiOperation({ summary: 'Log exercise | تسجيل تمرين' })
  @Post('exercise')
  logExercise(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id ?? 'guest';
    return this.nutritionService.logExercise(userId, body);
  }

  /** GET /api/v1/nutrition/exercise?date=YYYY-MM-DD — Get exercise history */
  @ApiOperation({ summary: 'Get exercise history | سجل التمارين' })
  @Get('exercise')
  getExerciseHistory(@Req() req: any, @Query('date') date?: string) {
    const userId = req.user?.id ?? 'guest';
    return this.nutritionService.getExerciseHistory(userId, date);
  }

  /* ───────── Weekly Report ───────── */

  /** GET /api/v1/nutrition/weekly-report — 7-day aggregated report */
  @ApiOperation({ summary: 'Get weekly nutrition report | تقرير التغذية الأسبوعي' })
  @Get('weekly-report')
  getWeeklyReport(@Req() req: any) {
    const userId = req.user?.id ?? 'guest';
    return this.nutritionService.getWeeklyReport(userId);
  }
}
