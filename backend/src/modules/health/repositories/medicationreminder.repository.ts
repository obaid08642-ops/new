import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  MedicationReminder  } from '../../../schemas/health.schema';

@Injectable()
export class MedicationReminderRepository extends MongoRepository<MedicationReminder> {
  constructor(@InjectModel(MedicationReminder.name) model: Model<MedicationReminder>) {
    super(model);
  }
}
