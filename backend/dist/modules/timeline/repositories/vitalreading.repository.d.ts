import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
export declare class VitalReadingRepository extends MongoRepository<any> {
    constructor(model: Model<any>);
}
