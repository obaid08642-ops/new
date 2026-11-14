/** The booking a chat thread belongs to, from GET /chat/threads/:id/permissions (`booking_id`); null when the answer has none. */
export function readThreadBooking(answer: unknown): string | null {
  const root = answer && typeof answer === 'object' ? (answer as Record<string, unknown>) : null;
  const data = root?.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
  const id = data?.booking_id;
  return typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id) ? id : null;
}
