import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { LabSample } from '../../../schemas/lab.schema';
export declare class LabSampleRepository extends MongoRepository<LabSample> {
    constructor(model: Model<LabSample>);
}
