// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  RadiologyBooking, any  } from '../../../schemas/radiology.schema';

@Injectable()
export class RadiologyBookingRepository extends MongoRepository<any> {
  constructor(@InjectModel(RadiologyBooking.name) model: Model<any>) {
    super(model);
  }
}
