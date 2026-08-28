import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { LabService } from '../../../schemas/lab.schema';
export declare class LabServiceRepository extends MongoRepository<LabService> {
    constructor(model: Model<LabService>);
}
