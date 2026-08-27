import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  SharedCalendarEvent  } from '../../../schemas/family.schemas';

@Injectable()
export class SharedCalendarEventRepository extends MongoRepository<any> {
  constructor(@InjectModel(SharedCalendarEvent.name) model: Model<any>) {
    super(model);
  }
}
