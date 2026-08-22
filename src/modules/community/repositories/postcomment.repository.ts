import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  PostComment  } from '../../../schemas/community.schemas';

@Injectable()
export class PostCommentRepository extends MongoRepository<any> {
  constructor(@InjectModel(PostComment.name) model: Model<any>) {
    super(model);
  }
}
