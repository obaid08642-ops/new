import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MentalHealthService } from './mental-health.service';
import { MentalHealthController } from './mental-health.controller';
import {
  MoodEntrySchema,
  MeditationSessionSchema,
  BreathingSessionSchema,
} from '../../schemas/mental-health.schema';
import { BreathingSessionRepository } from './repositories/breathingsession.repository';
import { MeditationSessionRepository } from './repositories/meditationsession.repository';
import { MoodEntryRepository } from './repositories/moodentry.repository';
import { MentalHealthUrgentHelpController } from './mental-health-urgent-help.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MoodEntry', schema: MoodEntrySchema },
      { name: 'MeditationSession', schema: MeditationSessionSchema },
      { name: 'BreathingSession', schema: BreathingSessionSchema },
    ]),
  ],
  controllers: [MentalHealthController, MentalHealthUrgentHelpController],
  providers: [
    MentalHealthService,
    { provide: 'BreathingSessionRepository', useClass: BreathingSessionRepository },
    { provide: 'MeditationSessionRepository', useClass: MeditationSessionRepository },
    { provide: 'MoodEntryRepository', useClass: MoodEntryRepository },
  ],
  exports: [MentalHealthService],
})
export class MentalHealthModule {}
