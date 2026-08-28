import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
export declare class RewardRepository extends MongoRepository<any> {
    constructor(model: Model<any>);
}
