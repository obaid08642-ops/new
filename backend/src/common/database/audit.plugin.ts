// @ts-nocheck
import { Schema } from 'mongoose';

export function AuditPlugin(schema: Schema, options?: any) {
  schema.add({
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null },
    created_by: { type: String, default: null },
    updated_by: { type: String, default: null },
  });

  // Soft delete query middleware
  const types = ['find', 'findOne', 'findOneAndUpdate', 'count', 'countDocuments', 'updateMany'];
  
  types.forEach((type) => {
    schema.pre(type as any, function(next) {
      // If the query doesn't explicitly ask for deleted docs, filter them out
      if (this.getQuery().is_deleted !== true) {
        this.where({ is_deleted: { $ne: true } });
      }
      next();
    });
  });

  // Automatically update timestamps if schema has timestamps enabled (Mongoose does this inherently)
  // We can also hook into update to set updated_by if passed in options/context.
}
