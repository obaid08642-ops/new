// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  RadiologyService  } from '../../../schemas/radiology.schema';

@Injectable()
export class RadiologyServiceRepository extends MongoRepository<RadiologyService> {
  constructor(@InjectModel(RadiologyService.name) model: Model<RadiologyService>) {
    super(model);
  }
}
