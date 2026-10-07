import { Types } from 'mongoose';
import { Model, FilterQuery } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

export function findByAnyId<T>(model: Model<T>, id: string): FilterQuery<T> {
  if (Types.ObjectId.isValid(id)) {
    return { _id: new Types.ObjectId(id) };
  }
  return { id };
}

export async function findOneByAnyId<T>(model: Model<T>, id: string) {
  return model.findOne(findByAnyId(model, id));
}

export async function findByIdOrThrow<T>(model: Model<T>, id: string, errorMsg = 'Not found') {
  const doc = await findOneByAnyId(model, id);
  if (!doc) throw new NotFoundException(errorMsg);
  return doc;
}