import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { SystemConfig, SystemConfigDocument } from '../../../../schemas/system-config.schema';

@Injectable()
export class SystemConfigRepository extends MongoRepository<SystemConfigDocument> {
  constructor(@InjectModel(SystemConfig.name) model: Model<SystemConfigDocument>) {
    super(model);
  }
}
