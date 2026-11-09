import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Owner decision 1 (order for a family member): a booking or order may name `family_member_id`, the member it is FOR.
 * The caller stays the booker and payer (`patient_id` / `patient_account_id` do not change); the id is stored on the booking.
 *
 * Returns the id to store, or undefined for the default (nothing given, or the caller's own id: the booking is for the patient).
 * A member that is not one of the caller's family members is answered as not found, so another user's ids cannot be probed.
 */
export async function resolveFamilyMemberId(
  db: { collection(name: string): { findOne(filter: any, options?: any): Promise<any> } },
  userId: string,
  memberId: unknown,
): Promise<string | undefined> {
  if (memberId === undefined || memberId === null || memberId === '') return undefined;
  if (typeof memberId !== 'string' || memberId.length > 128) throw new BadRequestException('family_member_id_invalid');
  if (memberId === userId) return undefined;
  const m = await db.collection('family_members').findOne(
    { id: { $eq: memberId }, $or: [{ owner_id: userId }, { user_id: userId }, { patient_id: userId }] },
    { projection: { _id: 0, id: 1 } },
  );
  if (!m) throw new NotFoundException('family_member_not_found');
  return memberId;
}
