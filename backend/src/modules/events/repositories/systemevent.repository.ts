// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import { SystemEvent } from '../system-event.schema';

@Injectable()
export class SystemEventRepository extends MongoRepository<SystemEvent> {
  constructor(@InjectModel(SystemEvent.name) model: Model<SystemEvent>) {
    super(model);
  }
}
