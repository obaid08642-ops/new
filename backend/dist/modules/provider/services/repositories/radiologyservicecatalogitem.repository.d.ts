import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { RadiologyServiceCatalogItem } from '../../schemas';
export declare class RadiologyServiceCatalogItemRepository extends MongoRepository<RadiologyServiceCatalogItem> {
    constructor(model: Model<RadiologyServiceCatalogItem>);
}
