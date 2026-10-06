import { SERVICE_ICONS, type FillIconName, type ServiceTone } from '../../../packages/ui/icons/fill';

/**
 * The notification feed (GET /notifications): what a row is, the filled icon and tone that draw each type (handoff
 * service map and the Notifications board, not hex colours), the filter groups, the board's "Today / Earlier"
 * sections, and the "5 minutes ago" label. Pure functions, so the screen and its tests read the same rules.
 */

export type NotifGroup = 'system' | 'medical' | 'promotion';

/** A row of GET /notifications as the backend sends it (title and body are already in the user's language). */
export interface RawNotification {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  createdAt?: string;
  read?: boolean;
  action?: { route?: string };
}

export interface Notif {
  id: string;
  title: string;
  body: string;
  createdAt?: string;
  group: NotifGroup;
  read: boolean;
  /** The backend's route; translated to an app route when opened. */
  route?: string;
  icon: FillIconName;
  tone: ServiceTone;
}

/** The notification bell (Notifications board: the reminder bell, in the nursing teal). Used for reminders, the empty feed and the permission. */
export const BELL: { icon: FillIconName; tone: ServiceTone } = { icon: 'bell', tone: SERVICE_ICONS.nursing.tone };

/** Backend `type` → filter group, filled icon and tone. */
const TYPE_META: Record<string, { group: NotifGroup; icon: FillIconName; tone: ServiceTone }> = {
  appointment: { group: 'medical', icon: 'calendar-dots', tone: 'blue' },
  prescription: { group: 'medical', icon: 'prescription', tone: 'violet' },
  medication: { group: 'medical', ...BELL },
  emergency: { group: 'medical', icon: 'ambulance', tone: 'peach' },
  labs: { group: 'medical', icon: 'file-text', tone: 'mint' },
  promo: { group: 'promotion', icon: 'gift', tone: 'amber' },
  order: { group: 'system', icon: 'moped', tone: SERVICE_ICONS.pharmacy.tone },
  alert: { group: 'system', icon: 'warning', tone: 'amber' },
  info: { group: 'system', icon: 'info', tone: 'blue' },
};

/** The filter chips after "All": the group and its Arabic label. */
export const GROUPS: { key: NotifGroup; label: string }[] = [
  { key: 'system', label: 'تحديثات' },
  { key: 'medical', label: 'طبي' },
  { key: 'promotion', label: 'عروض' },
];

export function mapNotification(n: RawNotification): Notif {
  const meta = TYPE_META[n.type ?? ''] ?? TYPE_META.info;
  return {
    id: n.id,
    title: n.title || '',
    body: n.body || '',
    createdAt: n.createdAt,
    group: meta.group,
    read: !!n.read,
    route: n.action?.route,
    icon: meta.icon,
    tone: meta.tone,
  };
}

/** A section of the board: "Today" or "Earlier", with its Arabic title. */
export type DaySection = 'today' | 'earlier';

export function isToday(iso: string | undefined, now: Date = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export type FeedItem =
  | { kind: 'title'; key: string; section: DaySection }
  | { kind: 'row'; key: string; n: Notif; first: boolean; last: boolean };

/**
 * The list the screen draws: a title, then its rows (each knows whether it is the first or last of its card so the
 * card's corners and hairline can be drawn per row, which keeps the list virtualised), for Today then Earlier.
 */
export function buildFeed(rows: Notif[], now: Date = new Date()): FeedItem[] {
  const today = rows.filter((n) => isToday(n.createdAt, now));
  const earlier = rows.filter((n) => !isToday(n.createdAt, now));
  const out: FeedItem[] = [];
  const add = (section: DaySection, list: Notif[]) => {
    if (!list.length) return;
    out.push({ kind: 'title', key: `title-${section}`, section });
    list.forEach((n, i) => out.push({ kind: 'row', key: n.id, n, first: i === 0, last: i === list.length - 1 }));
  };
  add('today', today);
  add('earlier', earlier);
  return out;
}

/**
 * "Now", "5 minutes ago", "3 hours ago", "Yesterday", "4 days ago", else the date. `tr` translates the Arabic
 * source phrases, where "{n}" stands for the number.
 */
export function relativeTime(iso: string | undefined, tr: (s: string) => string, dateLocale: string, now: number = Date.now()): string {
  if (!iso) return '';
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return tr('الآن');
  if (mins < 60) return tr('منذ {n} دقيقة').replace('{n}', String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return tr('منذ {n} ساعة').replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  if (days === 1) return tr('أمس');
  if (days < 30) return tr('منذ {n} يوم').replace('{n}', String(days));
  return new Date(iso).toLocaleDateString(dateLocale);
}
