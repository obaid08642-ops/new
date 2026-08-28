import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { SystemEvent } from '../system-event.schema';
export declare class SystemEventRepository extends MongoRepository<SystemEvent> {
    constructor(model: Model<SystemEvent>);
}
