import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { DrugShortageFlag } from '../../schemas/pharmacy.schema';
export declare class DrugShortageFlagRepository extends MongoRepository<DrugShortageFlag> {
    constructor(model: Model<DrugShortageFlag>);
}
