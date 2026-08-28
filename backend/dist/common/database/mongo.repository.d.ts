import { Document, FilterQuery, Model, UpdateQuery, QueryOptions, ProjectionType, PipelineStage } from 'mongoose';
import { BaseRepository } from './base.repository';
export declare abstract class MongoRepository<T extends Document> implements BaseRepository<T> {
    readonly model: Model<T>;
    constructor(model: Model<T>);
    create(doc: Partial<T>): Promise<T>;
    findById(id: string, projection?: ProjectionType<T>, options?: QueryOptions): any;
    findOne(filterQuery: FilterQuery<T>, projection?: ProjectionType<T>, options?: QueryOptions): any;
    distinct(field: string, filterQuery?: FilterQuery<T>): any;
    find(filterQuery: FilterQuery<T>, projection?: ProjectionType<T>, options?: QueryOptions): any;
    updateOne(filterQuery: FilterQuery<T>, updateQuery: UpdateQuery<T>, options?: QueryOptions): any;
    updateById(id: string, updateQuery: UpdateQuery<T>, options?: QueryOptions): any;
    updateMany(filterQuery: FilterQuery<T>, updateQuery: UpdateQuery<T>, options?: QueryOptions): any;
    findOneAndUpdate(filterQuery: FilterQuery<T>, updateQuery: UpdateQuery<T>, options?: QueryOptions): any;
    findOneAndDelete(filterQuery: FilterQuery<T>, options?: QueryOptions): any;
    deleteOne(filterQuery: FilterQuery<T>): any;
    deleteById(id: string): any;
    deleteMany(filterQuery: FilterQuery<T>): any;
    insertMany(docs: Partial<T>[], options?: any): any;
    softDelete(id: string): any;
    count(filterQuery?: FilterQuery<T>): any;
    countDocuments(filterQuery?: FilterQuery<T>): any;
    exists(filterQuery: FilterQuery<T>): any;
    aggregate(pipeline: PipelineStage[]): any;
    get db(): any;
}
