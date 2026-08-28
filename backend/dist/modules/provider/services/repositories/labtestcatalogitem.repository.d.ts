import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { LabTestCatalogItem } from '../../schemas';
export declare class LabTestCatalogItemRepository extends MongoRepository<LabTestCatalogItem> {
    constructor(model: Model<LabTestCatalogItem>);
}
