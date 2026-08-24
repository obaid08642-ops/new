import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ImageProcessingJob, ImageProcessingJobDocument } from '../../../../schemas/image-processing-job.schema';

@Injectable()
export class ImageProcessingJobRepository extends MongoRepository<ImageProcessingJobDocument> {
  constructor(@InjectModel(ImageProcessingJob.name) model: Model<ImageProcessingJobDocument>) {
    super(model);
  }
}
