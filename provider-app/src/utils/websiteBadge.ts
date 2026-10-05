import { tokens } from '../theme/tokens';

/**
 * d2b9874 / R17: the "Website badge" a verified provider pastes on an external
 * site. The data comes from GET /provider/website-badge (backend
 * provider-badge.controller.ts websiteBadgeFor): verified only when status is
 * active AND medical_review_status approved AND public_eligibility true AND a
 * public profile page exists. The snippet uses the design-token colours only.
 */
export type WebsiteBadgeReason = 'not_active' | 'medical_review_not_approved' | 'not_public' | 'no_public_profile_page';

export type WebsiteBadge = {
  verified: boolean;
  reasons: WebsiteBadgeReason[];
  provider_type: string | null;
  profile_url: string | null;
  name_ar: string | null;
  name_en: string | null;
};

const REASONS: WebsiteBadgeReason[] = ['not_active', 'medical_review_not_approved', 'not_public', 'no_public_profile_page'];

export function parseWebsiteBadge(payload: unknown): WebsiteBadge | null {
  const root = payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const data = root && root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
  if (!data || typeof data.verified !== 'boolean') return null;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const url = str(data.profile_url);
  return {
    verified: data.verified && !!url && url.startsWith('https://'),
    reasons: Array.isArray(data.reasons) ? data.reasons.filter((r): r is WebsiteBadgeReason => REASONS.includes(r as WebsiteBadgeReason)) : [],
    provider_type: str(data.provider_type),
    profile_url: url,
    name_ar: str(data.name_ar),
    name_en: str(data.name_en),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Copy-paste HTML for an external site; null unless the provider is verified. */
export function buildWebsiteBadgeSnippet(badge: WebsiteBadge, lang: 'ar' | 'en'): string | null {
  if (!badge.verified || !badge.profile_url) return null;
  const name = (lang === 'ar' ? badge.name_ar ?? badge.name_en : badge.name_en ?? badge.name_ar) ?? '';
  const label = lang === 'ar' ? 'مزود معتمد على نبض بلس' : 'Verified on Nabd Plus';
  const title = name ? `${label} — ${name}` : label;
  const style = [
    'display:inline-block',
    'padding:8px 14px',
    'border-radius:999px',
    `border:1px solid ${tokens.border}`,
    `background:${tokens.successSurface}`,
    `color:${tokens.success}`,
    'font:600 14px/1.4 system-ui,sans-serif',
    'text-decoration:none',
  ].join(';');
  return `<a href="${escapeHtml(badge.profile_url)}" target="_blank" rel="noopener" title="${escapeHtml(title)}" style="${style}"${lang === 'ar' ? ' dir="rtl"' : ''}>${escapeHtml(title)}</a>`;
}

export const WEBSITE_BADGE_REASON_TEXT: Record<WebsiteBadgeReason, { ar: string; en: string }> = {
  not_active: { ar: 'حسابك غير مفعّل حالياً.', en: 'Your account is not active.' },
  medical_review_not_approved: { ar: 'لم تكتمل المراجعة الطبية لملفك بعد.', en: 'Your medical review is not approved yet.' },
  not_public: { ar: 'ملفك غير منشور للعامة. فعّل الصفحة العامة من إعدادات الموقع.', en: 'Your profile is not public. Enable the public page in your website settings.' },
  no_public_profile_page: { ar: 'لا توجد صفحة عامة لنوع حسابك على موقع نبض بلس بعد.', en: 'There is no public Nabd Plus page for your provider type yet.' },
};
