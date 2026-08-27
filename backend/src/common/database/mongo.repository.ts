import { Document, FilterQuery, Model, UpdateQuery, QueryOptions, ProjectionType, PipelineStage } from 'mongoose';
import { BaseRepository } from './base.repository';

export abstract class MongoRepository<T extends Document> implements BaseRepository<T> {
  constructor(public readonly model: Model<T>) {}

  async create(doc: Partial<T>): Promise<T> {
    const createdDoc = new this.model(doc);
    return createdDoc.save();
  }

  findById(id: string, projection?: ProjectionType<T>, options?: QueryOptions): any {
    return this.model.findById(id, projection, options);
  }

  findOne(filterQuery: FilterQuery<T>, projection?: ProjectionType<T>, options?: QueryOptions): any {
    return this.model.findOne(filterQuery, projection, options);
  }

  distinct(field: string, filterQuery: FilterQuery<T> = {}): any {
    return this.model.distinct(field, filterQuery);
  }

  find(filterQuery: FilterQuery<T>, projection?: ProjectionType<T>, options?: QueryOptions): any {
    return this.model.find(filterQuery, projection, options);
  }

  updateOne(filterQuery: FilterQuery<T>, updateQuery: UpdateQuery<T>, options?: QueryOptions): any {
    return this.model.findOneAndUpdate(filterQuery, updateQuery, { new: true, ...options });
  }

  updateById(id: string, updateQuery: UpdateQuery<T>, options?: QueryOptions): any {
    return this.model.findByIdAndUpdate(id, updateQuery, { new: true, ...options });
  }

  updateMany(filterQuery: FilterQuery<T>, updateQuery: UpdateQuery<T>, options?: QueryOptions): any {
    return this.model.updateMany(filterQuery, updateQuery, options as any);
  }

  findOneAndUpdate(filterQuery: FilterQuery<T>, updateQuery: UpdateQuery<T>, options?: QueryOptions): any {
    return this.model.findOneAndUpdate(filterQuery, updateQuery, options);
  }

  findOneAndDelete(filterQuery: FilterQuery<T>, options?: QueryOptions): any {
    return this.model.findOneAndDelete(filterQuery, options);
  }

  deleteOne(filterQuery: FilterQuery<T>): any {
    return this.model.deleteOne(filterQuery);
  }

  deleteById(id: string): any {
    return this.model.findByIdAndDelete(id);
  }

  deleteMany(filterQuery: FilterQuery<T>): any {
    return this.model.deleteMany(filterQuery);
  }

  insertMany(docs: Partial<T>[], options?: any): any {
    return this.model.insertMany(docs, options);
  }

  softDelete(id: string): any {
    return this.model.findByIdAndUpdate(id, { deletedAt: new Date() });
  }
  
  count(filterQuery?: FilterQuery<T>): any {
    return this.model.countDocuments(filterQuery || {});
  }
  
  countDocuments(filterQuery?: FilterQuery<T>): any {
    return this.model.countDocuments(filterQuery || {});
  }

  exists(filterQuery: FilterQuery<T>): any {
    return this.model.exists(filterQuery);
  }
  
  aggregate(pipeline: PipelineStage[]): any {
    return this.model.aggregate(pipeline);
  }
  
  // For edge cases where services directly used db
  get db(): any {
    return this.model.db;
  }
}
