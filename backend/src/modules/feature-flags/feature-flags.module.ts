// @ts-nocheck
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlag, FeatureFlagSchema } from './feature-flag.schema';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagRepository } from "./repositories/featureflag.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeatureFlag.name, schema: FeatureFlagSchema },
    ])
  ],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, { provide: 'FeatureFlagRepository', useClass: FeatureFlagRepository }],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
