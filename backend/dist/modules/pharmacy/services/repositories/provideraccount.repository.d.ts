import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderAccount } from '../../../provider/schemas';
export declare class ProviderAccountRepository extends MongoRepository<ProviderAccount> {
    constructor(model: Model<ProviderAccount>);
}
