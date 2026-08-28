import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ImageProcessingJobDocument } from '../../../../schemas/image-processing-job.schema';
export declare class ImageProcessingJobRepository extends MongoRepository<ImageProcessingJobDocument> {
    constructor(model: Model<ImageProcessingJobDocument>);
}
