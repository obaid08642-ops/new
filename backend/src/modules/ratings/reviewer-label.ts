/** What a public review shows of the reviewer (owner decision 2026-10-24): first name plus the initial of the last name. Never more. */
export function reviewerLabel(fullName: unknown): string | null {
  const parts = typeof fullName === 'string' ? fullName.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').trim().split(/\s+/).filter(Boolean) : [];
  if (!parts.length) return null;
  const first = parts[0].slice(0, 30);
  if (parts.length === 1) return first;
  const initial = Array.from(parts[parts.length - 1])[0];
  return `${first} ${initial}.`;
}
