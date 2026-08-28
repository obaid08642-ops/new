import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { VitalReading } from '../../../schemas/health.schema';
export declare class VitalReadingRepository extends MongoRepository<VitalReading> {
    constructor(model: Model<VitalReading>);
}
