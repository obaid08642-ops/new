import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NutritionService } from './nutrition.service';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'NutritionProfile', schema: NutritionProfileSchema },
      { name: 'MealLog', schema: MealLogSchema },
      { name: 'WaterLog', schema: WaterLogSchema },
      { name: 'ExerciseLog', schema: ExerciseLogSchema },
    ]),
  ],
  controllers: [NutritionController],
  providers: [NutritionService, { provide: 'ExerciseLogRepository', useClass: ExerciseLogRepository }, { provide: 'MealLogRepository', useClass: MealLogRepository }, { provide: 'NutritionProfileRepository', useClass: NutritionProfileRepository }, { provide: 'WaterLogRepository', useClass: WaterLogRepository }],
  exports: [NutritionService],
})
export class NutritionModule {}
