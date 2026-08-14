// @ts-nocheck
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MentalHealthService } from './mental-health.service';
import { MentalHealthController } from './mental-health.controller';
import {
  MoodEntrySchema,
  MeditationSessionSchema,
  BreathingSessionSchema,
  SelfAssessmentSchema,
  CrisisContactSchema,
} from '../../schemas/mental-health.schema';
import { BreathingSessionRepository } from "./repositories/breathingsession.repository";
import { CrisisContactRepository } from "./repositories/crisiscontact.repository";
import { MeditationSessionRepository } from "./repositories/meditationsession.repository";
import { MoodEntryRepository } from "./repositories/moodentry.repository";
import { SelfAssessmentRepository } from "./repositories/selfassessment.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MoodEntry', schema: MoodEntrySchema },
      { name: 'MeditationSession', schema: MeditationSessionSchema },
      { name: 'BreathingSession', schema: BreathingSessionSchema },
      { name: 'SelfAssessment', schema: SelfAssessmentSchema },
      { name: 'CrisisContact', schema: CrisisContactSchema },
    ]),
  ],
  controllers: [MentalHealthController],
  providers: [MentalHealthService, { provide: 'BreathingSessionRepository', useClass: BreathingSessionRepository }, { provide: 'CrisisContactRepository', useClass: CrisisContactRepository }, { provide: 'MeditationSessionRepository', useClass: MeditationSessionRepository }, { provide: 'MoodEntryRepository', useClass: MoodEntryRepository }, { provide: 'SelfAssessmentRepository', useClass: SelfAssessmentRepository }],
  exports: [MentalHealthService],
})
export class MentalHealthModule {}
