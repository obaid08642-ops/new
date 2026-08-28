import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderOperator } from '../../schemas';
export declare class ProviderOperatorRepository extends MongoRepository<ProviderOperator> {
    constructor(model: Model<ProviderOperator>);
}
