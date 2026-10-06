import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NutritionService } from './nutrition.service';
import { NutritionPlanService } from './nutrition-plan.service';
import { NutritionController } from './nutrition.controller';
import {
  NutritionProfileSchema,
  MealLogSchema,
  WaterLogSchema,
  ExerciseLogSchema,
} from '../../schemas/nutrition.schema';
import { ExerciseLogRepository } from "./repositories/exerciselog.repository";
import { MealLogRepository } from "./repositories/meallog.repository";
import { NutritionProfileRepository } from "./repositories/nutritionprofile.repository";
import { WaterLogRepository } from "./repositories/waterlog.repository";
import { NutritionFoodsController } from './nutrition-compat.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'NutritionProfile', schema: NutritionProfileSchema },
      { name: 'MealLog', schema: MealLogSchema },
      { name: 'WaterLog', schema: WaterLogSchema },
      { name: 'ExerciseLog', schema: ExerciseLogSchema },
    ]),
    AiModule,
  ],
  controllers: [NutritionController, NutritionFoodsController],
  providers: [NutritionService, NutritionPlanService, { provide: 'ExerciseLogRepository', useClass: ExerciseLogRepository }, { provide: 'MealLogRepository', useClass: MealLogRepository }, { provide: 'NutritionProfileRepository', useClass: NutritionProfileRepository }, { provide: 'WaterLogRepository', useClass: WaterLogRepository }],
  exports: [NutritionService, NutritionPlanService],
})
export class NutritionModule {}
