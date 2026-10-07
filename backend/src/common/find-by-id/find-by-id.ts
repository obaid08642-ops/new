import { Types } from 'mongoose';
import { Model, FilterQuery, Document } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

/**
 * Find a document by either ObjectId or string ID (UUID).
 * MongoDB stores _id as ObjectId, but many collections also have an 'id' string field.
 * This utility handles both cases safely.
 */
export function findByAnyId<T>(id: string): FilterQuery<T> {
  if (Types.ObjectId.isValid(id)) {
    return { _id: new Types.ObjectId(id) };
  }
  return { id };
}

/**
 * Find a single document by either ObjectId or string ID.
 */
export async function findOneByAnyId<T extends Document>(
  model: Model<T>,
  id: string,
): Promise<T | null> {
  return model.findOne(findByAnyId<T>(id)).exec();
}

/**
 * Find a single document by either ObjectId or string ID, throw if not found.
 */
export async function findOneByAnyIdOrThrow<T extends Document>(
  model: Model<T>,
  id: string,
  errorMessage = 'Document not found',
): Promise<T> {
  const doc = await findOneByAnyId(model, id);
  if (!doc) {
    throw new NotFoundException(errorMessage);
  }
  return doc;
}

/**
 * Find a document by ID and update it, handling both ObjectId and string ID.
 */
export async function findByIdAndUpdateByAnyId<T extends Document>(
  model: Model<T>,
  id: string,
  update: any,
  options: any = { new: true },
): Promise<T | null> {
  const result = await model.findOneAndUpdate(findByAnyId<T>(id), update, options).exec();
  return result as unknown as T | null;
}

/**
 * Find a document by ID and delete it, handling both ObjectId and string ID.
 */
export async function findByIdAndDeleteByAnyId<T extends Document>(
  model: Model<T>,
  id: string,
): Promise<T | null> {
  return model.findOneAndDelete(findByAnyId<T>(id)).exec();
}

/**
 * Check if a document exists by either ObjectId or string ID.
 */
export async function existsByAnyId<T extends Document>(
  model: Model<T>,
  id: string,
): Promise<boolean> {
  const doc = await model.findOne(findByAnyId<T>(id), { _id: 1 }).lean().exec();
  return !!doc;
}
