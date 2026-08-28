import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { FacilityDocument } from '../../../schemas/facility.schema';
export declare class FacilityRepository extends MongoRepository<FacilityDocument> {
    constructor(model: Model<FacilityDocument>);
}
