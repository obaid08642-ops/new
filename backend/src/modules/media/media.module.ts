import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaAsset, MediaAssetSchema } from './media.schema';
import { UploadSecurityService } from '../storage/upload-security.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: MediaAsset.name, schema: MediaAssetSchema }]), CommonModule],
  controllers: [MediaController],
  providers: [MediaService, UploadSecurityService],
  exports: [MediaService, UploadSecurityService],
})
export class MediaModule {}
