// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  CarePlan  } from '../../../schemas/home-care.schema';

@Injectable()
export class CarePlanRepository extends MongoRepository<CarePlan> {
  constructor(@InjectModel(CarePlan.name) model: Model<CarePlan>) {
    super(model);
  }
}
