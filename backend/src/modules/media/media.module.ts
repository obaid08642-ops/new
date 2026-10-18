import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaAsset, MediaAssetSchema } from './media.schema';
import { MediaCleanupService } from './media-cleanup.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule, MongooseModule.forFeature([{ name: MediaAsset.name, schema: MediaAssetSchema }])],
  controllers: [MediaController],
  providers: [MediaService, MediaCleanupService],
  exports: [MediaService, MediaCleanupService],
})
export class MediaModule {}
