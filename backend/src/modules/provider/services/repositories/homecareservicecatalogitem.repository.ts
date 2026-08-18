import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { HomeCareServiceCatalogItem } from '../../schemas';

@Injectable()
export class HomeCareServiceCatalogItemRepository extends MongoRepository<HomeCareServiceCatalogItem> {
  constructor(@InjectModel(HomeCareServiceCatalogItem.name) model: Model<HomeCareServiceCatalogItem>) {
    super(model);
  }
}
