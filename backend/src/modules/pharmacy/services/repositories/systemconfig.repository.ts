// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { SystemConfig } from '../../../../schemas/system-config.schema';

@Injectable()
export class SystemConfigRepository extends MongoRepository<SystemConfig> {
  constructor(@InjectModel(SystemConfig.name) model: Model<SystemConfig>) {
    super(model);
  }
}
