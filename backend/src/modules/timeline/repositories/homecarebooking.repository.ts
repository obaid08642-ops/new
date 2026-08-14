// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  HomeCareBooking, any  } from '../../../schemas/home-care.schema';

@Injectable()
export class HomeCareBookingRepository extends MongoRepository<any> {
  constructor(@InjectModel(HomeCareBooking.name) model: Model<any>) {
    super(model);
  }
}
