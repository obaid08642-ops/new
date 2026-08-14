// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  LabBooking  } from '../../../schemas/lab.schema';

@Injectable()
export class LabBookingRepository extends MongoRepository<LabBooking> {
  constructor(@InjectModel(LabBooking.name) model: Model<LabBooking>) {
    super(model);
  }
}
