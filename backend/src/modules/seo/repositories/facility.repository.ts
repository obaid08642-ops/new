// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Facility, any  } from '../../../schemas/facility.schema';

@Injectable()
export class FacilityRepository extends MongoRepository<any> {
  constructor(@InjectModel(Facility.name) model: Model<any>) {
    super(model);
  }
}
