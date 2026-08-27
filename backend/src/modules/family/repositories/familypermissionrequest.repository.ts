import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  FamilyPermissionRequest  } from '../../../schemas/family.schemas';

@Injectable()
export class FamilyPermissionRequestRepository extends MongoRepository<any> {
  constructor(@InjectModel(FamilyPermissionRequest.name) model: Model<any>) {
    super(model);
  }
}
