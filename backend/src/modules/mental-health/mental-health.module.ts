import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MentalHealthService } from './mental-health.service';
import { MentalHealthController } from './mental-health.controller';
import {
  MoodEntrySchema,
  MeditationSessionSchema,
  BreathingSessionSchema,
  CrisisContactSchema,
} from '../../schemas/mental-health.schema';
import { BreathingSessionRepository } from './repositories/breathingsession.repository';
import { CrisisContactRepository } from './repositories/crisiscontact.repository';
import { MeditationSessionRepository } from './repositories/meditationsession.repository';
import { MoodEntryRepository } from './repositories/moodentry.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MoodEntry', schema: MoodEntrySchema },
      { name: 'MeditationSession', schema: MeditationSessionSchema },
      { name: 'BreathingSession', schema: BreathingSessionSchema },
      { name: 'CrisisContact', schema: CrisisContactSchema },
    ]),
  ],
  controllers: [MentalHealthController],
  providers: [
    MentalHealthService,
    { provide: 'BreathingSessionRepository', useClass: BreathingSessionRepository },
    { provide: 'CrisisContactRepository', useClass: CrisisContactRepository },
    { provide: 'MeditationSessionRepository', useClass: MeditationSessionRepository },
    { provide: 'MoodEntryRepository', useClass: MoodEntryRepository },
  ],
  exports: [MentalHealthService],
})
export class MentalHealthModule {}
