/**
 * The admin kill switches (issues 955 / 995). Every switch listed here is enforced on the server at the call that
 * starts the action it names (KillSwitchesService.assertOn), so turning one off refuses that action with
 * 503 `kill_switch_off:<key>` for every client. A switch that the server does not enforce must not be listed.
 *
 * Stored in `system_configs` `{ key: 'kill_switches', value: [{ key, value, reason, updated_by, updated_at }] }`;
 * a missing entry means ON (fail-open, as before).
 *
 * Removed from the old hard-coded list:
 * - `emergency_system` (emergency dispatch): that system is removed (owner decision 14).
 * - `online_payments` ("cash only"): online consultations, home visits and nursing are online-pay only (owner
 *   decision 25), so "cash only" cannot exist; pharmacy cash on delivery has its own control (config portal).
 */
export interface KillSwitchDefinition {
  key: string;
  name: string;
  description: string;
  danger: boolean;
}

export const KILL_SWITCHES: readonly KillSwitchDefinition[] = [
  { key: 'chat_enabled', name: 'المحادثات', description: 'يوقف إرسال الرسائل في محادثات الحجوزات والعائلة والمحادثات المباشرة. القراءة تبقى متاحة.', danger: true },
  { key: 'online_consultations', name: 'حجز الاستشارات عن بعد', description: 'يرفض حجز استشارات الفيديو والصوت الجديدة. الحجوزات القائمة وزيارات العيادة لا تتأثر.', danger: true },
  { key: 'provider_withdrawals', name: 'سحب أرباح المزودين', description: 'يرفض طلبات سحب الأرباح الجديدة من محافظ المزودين.', danger: true },
  { key: 'pharmacy_broadcast', name: 'إرسال طلبات الأدوية للصيدليات', description: 'يرفض إرسال طلبات الأدوية الجديدة للصيدليات. الطلب يبقى مسودة لدى المريض.', danger: false },
  { key: 'nursing_broadcast', name: 'طلبات التمريض المنزلي', description: 'يرفض حجوزات التمريض المنزلي الجديدة.', danger: false },
  { key: 'new_registrations', name: 'التسجيل الجديد', description: 'يرفض إنشاء حسابات جديدة (التسجيل وأول دخول بحساب اجتماعي). الحسابات القائمة تدخل كالمعتاد.', danger: false },
  { key: 'reviews_enabled', name: 'نشر التقييمات', description: 'يرفض التقييمات والمراجعات الجديدة من المرضى.', danger: false },
  { key: 'wearables_enabled', name: 'ربط الأجهزة القابلة للارتداء', description: 'يرفض ربط جهاز قابل للارتداء جديد.', danger: false },
];

export const KILL_SWITCH_KEYS: readonly string[] = KILL_SWITCHES.map((s) => s.key);

export type KillSwitchKey =
  | 'chat_enabled'
  | 'online_consultations'
  | 'provider_withdrawals'
  | 'pharmacy_broadcast'
  | 'nursing_broadcast'
  | 'new_registrations'
  | 'reviews_enabled'
  | 'wearables_enabled';

/** Apps whose maintenance banner (`system_configs.app_versions.apps[app].maintenance`) the clients read. */
export const EMERGENCY_APPS = ['patient', 'provider', 'driver', 'pharmacy', 'web'] as const;
