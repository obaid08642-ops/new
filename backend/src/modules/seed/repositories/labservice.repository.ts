// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  LabService  } from '../../../schemas/lab.schema';

@Injectable()
export class LabServiceRepository extends MongoRepository<LabService> {
  constructor(@InjectModel(LabService.name) model: Model<LabService>) {
    super(model);
  }
}
