import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlag, FeatureFlagSchema } from './feature-flag.schema';
import { FeatureFlagsController, PublicFeatureFlagsController } from './feature-flags.controller';
import { ExperimentController } from './experiment.controller';
import { ExperimentService } from './experiment.service';
import { FeatureFlagRepository } from "./repositories/featureflag.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeatureFlag.name, schema: FeatureFlagSchema },
    ])
  ],
  controllers: [FeatureFlagsController, PublicFeatureFlagsController, ExperimentController],
  providers: [FeatureFlagsService, ExperimentService, { provide: 'FeatureFlagRepository', useClass: FeatureFlagRepository }],
  exports: [FeatureFlagsService, ExperimentService],
})
export class FeatureFlagsModule {}
