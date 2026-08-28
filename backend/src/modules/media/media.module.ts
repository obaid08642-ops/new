import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaAsset, MediaAssetSchema } from './media.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: MediaAsset.name, schema: MediaAssetSchema }])],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
