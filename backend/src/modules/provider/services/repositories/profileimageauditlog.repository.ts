// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProfileImageAuditLog, ProfileImageAuditLogDocument } from '../../../../schemas/profile-image-audit-log.schema';

@Injectable()
export class ProfileImageAuditLogRepository extends MongoRepository<ProfileImageAuditLogDocument> {
  constructor(@InjectModel(ProfileImageAuditLog.name) model: Model<ProfileImageAuditLogDocument>) {
    super(model);
  }
}
