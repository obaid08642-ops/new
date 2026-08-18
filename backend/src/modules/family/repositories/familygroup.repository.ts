import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  FamilyGroup  } from '../../../schemas/family.schemas';

@Injectable()
export class FamilyGroupRepository extends MongoRepository<any> {
  constructor(@InjectModel(FamilyGroup.name) model: Model<any>) {
    super(model);
  }
}
