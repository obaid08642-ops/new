import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { AdPlacementDocument } from '../../../schemas/ad-placement.schema';
export declare class AdPlacementRepository extends MongoRepository<AdPlacementDocument> {
    constructor(model: Model<AdPlacementDocument>);
}
