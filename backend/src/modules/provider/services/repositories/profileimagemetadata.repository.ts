import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProfileImageMetadata, ProfileImageMetadataDocument } from '../../../../schemas/profile-image-metadata.schema';

@Injectable()
export class ProfileImageMetadataRepository extends MongoRepository<ProfileImageMetadataDocument> {
  constructor(@InjectModel(ProfileImageMetadata.name) model: Model<ProfileImageMetadataDocument>) {
    super(model);
  }
}
