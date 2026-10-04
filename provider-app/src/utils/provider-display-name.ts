/**
 * b4d1d98: the provider's own name from its profile, in the user's language,
 * falling back to the other language and then the account email. Never an
 * invented facility name.
 */
export function providerDisplayName(user: { nameAr?: string; nameEn?: string; email?: string } | null | undefined, ar: boolean): string {
  if (!user) return '';
  const first = ar ? user.nameAr : user.nameEn;
  const second = ar ? user.nameEn : user.nameAr;
  return (first || second || user.email || '').trim();
}
