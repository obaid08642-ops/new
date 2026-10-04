import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaAsset, MediaAssetSchema } from './media.schema';
import { UploadSecurityService } from '../storage/upload-security.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: MediaAsset.name, schema: MediaAssetSchema }])],
  controllers: [MediaController],
  providers: [MediaService, UploadSecurityService],
  exports: [MediaService, UploadSecurityService],
})
export class MediaModule {}
