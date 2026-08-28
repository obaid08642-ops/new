import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderScheduleSlot } from '../../schemas';
export declare class ProviderScheduleSlotRepository extends MongoRepository<ProviderScheduleSlot> {
    constructor(model: Model<ProviderScheduleSlot>);
}
