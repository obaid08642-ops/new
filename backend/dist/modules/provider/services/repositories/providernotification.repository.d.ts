import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderNotification } from '../../schemas';
export declare class ProviderNotificationRepository extends MongoRepository<ProviderNotification> {
    constructor(model: Model<ProviderNotification>);
}
