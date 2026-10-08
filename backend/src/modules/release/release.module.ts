import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReleaseController } from './release.controller';
import { ReleaseService } from './release.service';
import { ReleaseVersion, ReleaseVersionSchema } from './schemas/release.schema';
import { ReleaseRollout, ReleaseRolloutSchema } from './schemas/release.schema';
import { AppStoreReview, AppStoreReviewSchema } from './schemas/release.schema';
import { RatingPrompt, RatingPromptSchema } from './schemas/release.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReleaseVersion.name, schema: ReleaseVersionSchema },
      { name: ReleaseRollout.name, schema: ReleaseRolloutSchema },
      { name: AppStoreReview.name, schema: AppStoreReviewSchema },
      { name: RatingPrompt.name, schema: RatingPromptSchema },
    ]),
  ],
  controllers: [ReleaseController],
  providers: [
    ReleaseService,
    { provide: 'ReleaseVersionModel', useExisting: ReleaseVersion.name },
    { provide: 'ReleaseRolloutModel', useExisting: ReleaseRollout.name },
    { provide: 'AppStoreReviewModel', useExisting: AppStoreReview.name },
    { provide: 'RatingPromptModel', useExisting: RatingPrompt.name },
  ],
  exports: [ReleaseService],
})
export class ReleaseModule {}
