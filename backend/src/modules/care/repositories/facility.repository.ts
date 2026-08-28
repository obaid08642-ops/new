import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Facility, FacilityDocument  } from '../../../schemas/facility.schema';

@Injectable()
export class FacilityRepository extends MongoRepository<FacilityDocument> {
  constructor(@InjectModel(Facility.name) model: Model<FacilityDocument>) {
    super(model);
  }
}
