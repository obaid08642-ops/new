import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  MaternityProfile, MaternityProfileDocument  } from '../../../schemas/maternity.schema';

@Injectable()
export class MaternityProfileRepository extends MongoRepository<MaternityProfileDocument> {
  constructor(@InjectModel(MaternityProfile.name) model: Model<MaternityProfileDocument>) {
    super(model);
  }
}
