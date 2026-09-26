import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { Article } from '../../../schemas/article.schema';

@Injectable()
export class ArticleRepository extends MongoRepository<any> {
  constructor(@InjectModel(Article.name) model: Model<any>) {
    super(model);
  }
}
