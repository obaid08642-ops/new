import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  DriverShift, DriverShiftDocument  } from '../../../schemas/driver-shift.schema';

@Injectable()
export class DriverShiftRepository extends MongoRepository<DriverShiftDocument> {
  constructor(@InjectModel(DriverShift.name) model: Model<DriverShiftDocument>) {
    super(model);
  }
}
