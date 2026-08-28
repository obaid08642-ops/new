import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { HomeCareService } from '../../../schemas/home-care.schema';
export declare class HomeCareServiceRepository extends MongoRepository<HomeCareService> {
    constructor(model: Model<HomeCareService>);
}
