import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { LabResult } from '../../../schemas/lab-result.schema';
export declare class LabResultRepository extends MongoRepository<LabResult> {
    constructor(model: Model<LabResult>);
}
