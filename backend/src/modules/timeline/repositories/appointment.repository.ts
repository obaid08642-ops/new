import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Appointment  } from '../../../schemas/extra.schemas';

@Injectable()
export class AppointmentRepository extends MongoRepository<any> {
  constructor(@InjectModel(Appointment.name) model: Model<any>) {
    super(model);
  }
}
