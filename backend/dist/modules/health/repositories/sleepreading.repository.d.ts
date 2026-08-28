import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { SleepReading } from '../../../schemas/health.schema';
export declare class SleepReadingRepository extends MongoRepository<SleepReading> {
    constructor(model: Model<SleepReading>);
}
