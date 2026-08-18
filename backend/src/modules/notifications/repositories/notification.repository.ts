import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Notification, NotificationDocument  } from '../../../schemas/notification.schema';

@Injectable()
export class NotificationRepository extends MongoRepository<NotificationDocument> {
  constructor(@InjectModel(Notification.name) model: Model<NotificationDocument>) {
    super(model);
  }
}
