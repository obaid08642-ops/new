import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { DoctorSessionType } from '../../schemas';

@Injectable()
export class DoctorSessionTypeRepository extends MongoRepository<DoctorSessionType> {
  constructor(@InjectModel(DoctorSessionType.name) model: Model<DoctorSessionType>) {
    super(model);
  }
}
