import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderProfile } from '../../../provider/schemas';
export declare class ProviderAccountProfileRepository extends MongoRepository<ProviderProfile> {
    constructor(model: Model<ProviderProfile>);
}
