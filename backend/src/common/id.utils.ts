import { Types } from 'mongoose';

/** True when `id` can be cast to a Mongo ObjectId. */
export function isObjectIdString(id: unknown): id is string {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
}

/**
 * Resolve a public id to a Mongoose filter without throwing CastError.
 * Valid ObjectIds query `_id`; anything else queries the string `id`
 * field (P2 single provider identity) and never throws — callers 404
 * on a null result instead of 500ing on a cast.
 */
export function idFilter(id: string): Record<string, unknown> {
  return isObjectIdString(id)
    ? { _id: { $eq: new Types.ObjectId(id) } }
    : { id: { $eq: id } };
}

/**
 * Find one document by either ObjectId or public string id.
 * Returns null (never throws) so services can raise NotFoundException.
 */
export async function findByAnyId<T>(
  model: { findOne: (f: unknown) => { exec: () => Promise<T | null> } },
  id: string,
  extra?: Record<string, unknown>,
): Promise<T | null> {
  return model.findOne({ ...idFilter(id), ...(extra ?? {}) }).exec();
}
