import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { SystemConfigDocument } from '../../../schemas/system-config.schema';
export declare class SystemConfigRepository extends MongoRepository<SystemConfigDocument> {
    constructor(model: Model<SystemConfigDocument>);
}
