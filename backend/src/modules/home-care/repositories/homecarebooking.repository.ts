import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  HomeCareBooking  } from '../../../schemas/home-care.schema';

@Injectable()
export class HomeCareBookingRepository extends MongoRepository<HomeCareBooking> {
  constructor(@InjectModel(HomeCareBooking.name) model: Model<HomeCareBooking>) {
    super(model);
  }
}
