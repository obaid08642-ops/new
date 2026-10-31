/** What the support list shows for a request's status: a translated label, never the server's raw word (`IN_PROGRESS`). */
export type SupportStatusTone = 'info' | 'warning' | 'success' | 'neutral';

const MAP: Record<string, { key: string; tone: SupportStatusTone }> = {
  OPEN: { key: 'support.status.open', tone: 'info' },
  IN_PROGRESS: { key: 'support.status.inProgress', tone: 'warning' },
  RESOLVED: { key: 'support.status.resolved', tone: 'success' },
  CLOSED: { key: 'support.status.closed', tone: 'neutral' },
};

/** Null for a status this app does not know: the tag is then left out rather than showing a raw code. */
export function supportStatus(status?: string | null): { key: string; tone: SupportStatusTone } | null {
  if (!status) return null;
  return MAP[String(status).trim().toUpperCase().replace(/[\s-]+/g, '_')] ?? null;
}
