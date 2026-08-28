"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoRepository = void 0;
class MongoRepository {
    constructor(model) {
        this.model = model;
    }
    async create(doc) {
        const createdDoc = new this.model(doc);
        return createdDoc.save();
    }
    findById(id, projection, options) {
        return this.model.findById(id, projection, options);
    }
    findOne(filterQuery, projection, options) {
        return this.model.findOne(filterQuery, projection, options);
    }
    distinct(field, filterQuery = {}) {
        return this.model.distinct(field, filterQuery);
    }
    find(filterQuery, projection, options) {
        return this.model.find(filterQuery, projection, options);
    }
    updateOne(filterQuery, updateQuery, options) {
        return this.model.findOneAndUpdate(filterQuery, updateQuery, { new: true, ...options });
    }
    updateById(id, updateQuery, options) {
        return this.model.findByIdAndUpdate(id, updateQuery, { new: true, ...options });
    }
    updateMany(filterQuery, updateQuery, options) {
        return this.model.updateMany(filterQuery, updateQuery, options);
    }
    findOneAndUpdate(filterQuery, updateQuery, options) {
        return this.model.findOneAndUpdate(filterQuery, updateQuery, options);
    }
    findOneAndDelete(filterQuery, options) {
        return this.model.findOneAndDelete(filterQuery, options);
    }
    deleteOne(filterQuery) {
        return this.model.deleteOne(filterQuery);
    }
    deleteById(id) {
        return this.model.findByIdAndDelete(id);
    }
    deleteMany(filterQuery) {
        return this.model.deleteMany(filterQuery);
    }
    insertMany(docs, options) {
        return this.model.insertMany(docs, options);
    }
    softDelete(id) {
        return this.model.findByIdAndUpdate(id, { deletedAt: new Date() });
    }
    count(filterQuery) {
        return this.model.countDocuments(filterQuery || {});
    }
    countDocuments(filterQuery) {
        return this.model.countDocuments(filterQuery || {});
    }
    exists(filterQuery) {
        return this.model.exists(filterQuery);
    }
    aggregate(pipeline) {
        return this.model.aggregate(pipeline);
    }
    get db() {
        return this.model.db;
    }
}
exports.MongoRepository = MongoRepository;
//# sourceMappingURL=mongo.repository.js.map