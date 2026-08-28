import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Post  } from '../../../schemas/community.schemas';

@Injectable()
export class PostRepository extends MongoRepository<any> {
  constructor(@InjectModel(Post.name) model: Model<any>) {
    super(model);
  }
}
