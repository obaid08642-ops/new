import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { HomeCareServiceCatalogItem } from '../../schemas';
export declare class HomeCareServiceCatalogItemRepository extends MongoRepository<HomeCareServiceCatalogItem> {
    constructor(model: Model<HomeCareServiceCatalogItem>);
}
