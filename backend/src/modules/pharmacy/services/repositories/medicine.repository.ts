// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { Medicine } from '../../../../schemas/medicine.schema';

@Injectable()
export class MedicineRepository extends MongoRepository<Medicine> {
  constructor(@InjectModel(Medicine.name) model: Model<Medicine>) {
    super(model);
  }
}
