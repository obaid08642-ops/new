/** Arabic names of the product modules the backend can switch (backend/src/modules/module-switches). Unknown keys fall back to the key. */
export const MODULE_LABELS: Record<string, string> = {
  pharmacy: 'الصيدلية',
  consultations: 'الاستشارات والمواعيد',
  labs_radiology: 'المختبرات والأشعة',
  nursing: 'التمريض والرعاية المنزلية',
  nutrition: 'التغذية',
  maternity: 'الأمومة والحمل',
  mental_health: 'الصحة النفسية',
  family: 'العائلة',
  insurance: 'التأمين',
  loyalty: 'برنامج الولاء',
  ai: 'المساعد الذكي',
  articles: 'المقالات',
};

export function moduleLabel(key: string): string {
  return MODULE_LABELS[key] ?? key;
}

export type ModuleRow = { key: string; label: string; enabled: boolean };

/** GET /modules answers { modules: { key: boolean } }; anything else is an empty list. */
export function moduleRows(payload: unknown): ModuleRow[] {
  const map = (payload as { modules?: Record<string, unknown> } | null)?.modules;
  if (!map || typeof map !== 'object') return [];
  return Object.entries(map).map(([key, value]) => ({ key, label: moduleLabel(key), enabled: value !== false }));
}

/** The consequence sentence the confirmation shows (owner decision 16). */
export const DISABLE_CONSEQUENCE = 'ستختفي هذه الخدمة من التطبيق والموقع';
export const ENABLE_CONSEQUENCE = 'ستظهر هذه الخدمة من جديد في التطبيق والموقع';
