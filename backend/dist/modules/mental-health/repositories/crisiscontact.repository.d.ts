import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { CrisisContactDocument } from '../../../schemas/mental-health.schema';
export declare class CrisisContactRepository extends MongoRepository<CrisisContactDocument> {
    constructor(model: Model<CrisisContactDocument>);
}
