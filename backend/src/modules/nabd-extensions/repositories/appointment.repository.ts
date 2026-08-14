// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Appointment, AppointmentDocument  } from '../../../schemas/extra.schemas';

@Injectable()
export class AppointmentRepository extends MongoRepository<AppointmentDocument> {
  constructor(@InjectModel(Appointment.name) model: Model<AppointmentDocument>) {
    super(model);
  }
}
