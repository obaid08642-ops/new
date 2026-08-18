/**
 * RTK Query Cache Tags Definitions
 * Adhering to the Naming Convention: PascalCase singular.
 */

export const CacheTags = {
  User: 'User',
  Profile: 'Profile',
  Doctor: 'Doctor',
  Pharmacy: 'Pharmacy',
  Laboratory: 'Laboratory',
  Nurse: 'Nurse',
  Consultation: 'Consultation',
  Order: 'Order',
  Cart: 'Cart',
  Appointment: 'Appointment',
  Notification: 'Notification',
  Settings: 'Settings',
  Review: 'Review',
  Favorite: 'Favorite',
} as const;

export type CacheTagType = typeof CacheTags[keyof typeof CacheTags];

/**
 * Common tag helper for lists.
 * Generates tags for the entire list and individual items to enable targeted cache invalidation.
 */
export function providesList<R extends { id: string | number }[], T extends string>(
  resultsWithIds: R | undefined,
  tagType: T
) {
  return resultsWithIds
    ? [
        { type: tagType, id: 'LIST' },
        ...resultsWithIds.map(({ id }) => ({ type: tagType, id })),
      ]
    : [{ type: tagType, id: 'LIST' }];
}
