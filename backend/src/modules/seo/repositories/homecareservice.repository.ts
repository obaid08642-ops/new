import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  HomeCareService  } from '../../../schemas/home-care.schema';

@Injectable()
export class HomeCareServiceRepository extends MongoRepository<any> {
  constructor(@InjectModel(HomeCareService.name) model: Model<any>) {
    super(model);
  }
}
