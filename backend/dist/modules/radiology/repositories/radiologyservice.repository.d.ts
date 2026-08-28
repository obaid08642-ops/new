import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { RadiologyService } from '../../../schemas/radiology.schema';
export declare class RadiologyServiceRepository extends MongoRepository<RadiologyService> {
    constructor(model: Model<RadiologyService>);
}
