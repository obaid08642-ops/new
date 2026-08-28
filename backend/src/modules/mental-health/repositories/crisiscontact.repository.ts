import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  CrisisContact, CrisisContactDocument  } from '../../../schemas/mental-health.schema';

@Injectable()
export class CrisisContactRepository extends MongoRepository<CrisisContactDocument> {
  constructor(@InjectModel(CrisisContact.name) model: Model<CrisisContactDocument>) {
    super(model);
  }
}
