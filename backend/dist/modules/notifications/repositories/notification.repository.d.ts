import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { NotificationDocument } from '../../../schemas/notification.schema';
export declare class NotificationRepository extends MongoRepository<NotificationDocument> {
    constructor(model: Model<NotificationDocument>);
}
