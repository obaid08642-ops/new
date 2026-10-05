// Admin navigation and per-route permissions, shared by AdminGuard (nav
// visibility + direct-URL enforcement) and tests. Vocabulary matches
// backend/src/common/permissions.ts.

export type NavItem = { href: string; label: string; permission?: string };
export type NavSection = { title: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'القيادة والمراقبة',
    items: [
      { href: '/admin/command-center', label: 'مركز القيادة الحي', permission: 'command.center.view' },
      { href: '/admin/orders', label: 'دورة الطلبات', permission: 'order.read' },
      { href: '/admin/analytics-suite', label: 'التحليلات', permission: 'analytics.read' },
      { href: '/admin/reports', label: 'التقارير التشغيلية', permission: 'analytics.read' },
      { href: '/admin/search', label: 'البحث الشامل', permission: 'users.view' },
      { href: '/admin/sos-monitor', label: 'مراقبة الطوارئ SOS' },
      { href: '/admin/fraud-monitoring', label: 'مراقبة الاحتيال' },
    ],
  },
  {
    title: 'المزودون والاعتمادات',
    items: [
      { href: '/admin/provider-moderation', label: 'تدقيق واعتماد المزودين' },
      { href: '/admin/provider-audits', label: 'سجلات تدقيق المزودين' },
      { href: '/admin/insurance-queue', label: 'طابور الموافقات التأمينية' },
      { href: '/admin/insurance-companies', label: 'شركات التأمين المعتمدة' },
      { href: '/admin/ambulance-fleet', label: 'أسطول مركبات الإسعاف' },
      { href: '/admin/pharmacy-procurement', label: 'توريدات ومخازن الأدوية' },
      { href: '/admin/nursing-portal', label: 'بوابة وإدارة التمريض' },
      { href: '/admin/support-tickets', label: 'تذاكر الدعم والشكاوى' },
      // Q61: guest job submissions are reviewed and published here.
      { href: '/admin/jobs', label: 'مراجعة الوظائف' },
      { href: '/admin/config-portal', label: 'بوابة الإعدادات العامة' },
    ],
  },
  {
    title: 'الماليات',
    items: [
      { href: '/admin/finance-suite', label: 'المالية والتسويات', permission: 'finance.read' },
      { href: '/admin/disputes', label: 'النزاعات المالية', permission: 'disputes.resolve' },
      { href: '/admin/payouts', label: 'اعتمادات السحب' },
      { href: '/admin/returns', label: 'طلبات الإرجاع والاسترداد' },
      { href: '/admin/financial-ledger', label: 'دفتر الأستاذ المالي' },
    ],
  },
  {
    title: 'العملاء والنمو',
    items: [
      { href: '/admin/crm', label: 'CRM 360', permission: 'crm.read' },
      { href: '/admin/segments', label: 'شرائح العملاء', permission: 'crm.read' },
      { href: '/admin/gdpr', label: 'خصوصية البيانات', permission: 'gdpr.manage' },
      { href: '/admin/content-growth', label: 'المحتوى والنمو', permission: 'cms.edit' },
      { href: '/admin/home-curation', label: 'ترتيب الصفحة الرئيسية', permission: 'cms.edit' },
      { href: '/admin/search-intelligence', label: 'ذكاء وتحليلات البحث' },
      { href: '/admin/catalog-governance', label: 'حوكمة الكتالوج' },
      { href: '/admin/medicines-catalog', label: 'كتالوج الأدوية' },
      { href: '/admin/catalog-manager', label: 'كتالوج الأشعة والتحاليل والتمريض' },
      { href: '/admin/price-override-audit', label: 'تدقيق أسعار الأدوية' },
      { href: '/admin/community-moderation', label: 'إشراف المجتمع' },
      { href: '/admin/loyalty-config', label: 'إعدادات الولاء' },
      { href: '/admin/live-chat-console', label: 'الشات الحي' },
      { href: '/admin/appointments-oversight', label: 'إشراف المواعيد' },
      { href: '/admin/broadcast-monitor', label: 'مراقبة البث' },
      { href: '/admin/users-management', label: 'إدارة المستخدمين' },
      { href: '/admin/locations', label: 'إدارة المدن والأحياء' },
      { href: '/admin/impersonation', label: 'جلسات الدعم المقيّدة', permission: 'user.impersonate' },
    ],
  },
  {
    title: 'النظام',
    items: [
      { href: '/admin/rbac', label: 'الأدوار والصلاحيات', permission: 'rbac.manage' },
      { href: '/admin/system-ops', label: 'تشغيل النظام', permission: 'ops.queues.manage' },
      { href: '/admin/scheduled-reports', label: 'التقارير المجدولة', permission: 'reports.schedule.manage' },
      { href: '/admin/audit-logs', label: 'سجل التدقيق' },
      { href: '/admin/security', label: 'الأمان ومفاتيح الدخول' },
    ],
  },
];

export function permitted(item: NavItem, permissions: Set<string>) {
  // Single source of truth: nav visibility derives from the same route map,
  // so a link is never shown when its page would render a 403 panel.
  const required = item.permission ?? requiredPermissionFor(item.href);
  return !required || permissions.has(required);
}

// Per-page permission enforcement for direct-URL access (nav hiding alone is not enough).
// Vocabulary MUST match backend/src/common/permissions.ts exactly (dotted form).
// Underscore variants (command_center.view, scheduled_reports.manage) are never
// granted by the backend and previously locked those pages for every admin.
export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/admin/command-center': 'command.center.view',
  '/admin/sos-monitor': 'command.center.view',
  '/admin/fraud-monitoring': 'command.center.view',
  '/admin/health-dashboard': 'command.center.view',
  '/admin/orders': 'order.read',
  '/admin/order-detail': 'order.read',
  '/admin/broadcast-monitor': 'order.read',
  '/admin/appointments-oversight': 'appointment.read',
  '/admin/analytics-suite': 'analytics.read',
  '/admin/analytics': 'analytics.read',
  '/admin/search-intelligence': 'analytics.read',
  '/admin/finance-suite': 'finance.read',
  '/admin/financial-ledger': 'finance.read',
  '/admin/commissions': 'finance.read',
  '/admin/payouts': 'finance.payout.approve',
  '/admin/returns': 'finance.payout.approve',
  '/admin/disputes': 'disputes.resolve',
  '/admin/provider-moderation': 'doctor.read',
  '/admin/provider-audits': 'doctor.read',
  '/admin/insurance-queue': 'order.read',
  '/admin/insurance-companies': 'order.read',
  '/admin/ambulance-fleet': 'facility.read',
  '/admin/nursing-portal': 'appointment.read',
  '/admin/pharmacy-procurement': 'pharmacy.inventory.read',
  '/admin/medicines-catalog': 'catalog.read',
  '/admin/catalog-manager': 'catalog.read',
  '/admin/catalog-governance': 'catalog.read',
  '/admin/price-override-audit': 'catalog.read',
  '/admin/shortage-reports': 'catalog.read',
  '/admin/crm': 'crm.read',
  '/admin/segments': 'crm.read',
  '/admin/support-tickets': 'crm.read',
  '/admin/live-chat-console': 'crm.read',
  '/admin/users-management': 'user.read',
  '/admin/gdpr': 'gdpr.manage',
  '/admin/legal-policies': 'gdpr.manage',
  '/admin/content-growth': 'cms.edit',
  '/admin/home-curation': 'cms.edit',
  '/admin/community-moderation': 'cms.edit',
  '/admin/jobs': 'cms.edit',
  '/admin/loyalty-config': 'coupons.manage',
  '/admin/notification-center': 'ops.queues.manage',
  '/admin/system-ops': 'ops.queues.manage',
  '/admin/config-portal': 'ops.queues.manage',
  '/admin/ai-control': 'ops.queues.manage',
  '/admin/audit-logs': 'data.export',
  '/admin/rbac': 'rbac.manage',
  '/admin/scheduled-reports': 'reports.schedule.manage',
  '/admin/impersonation': 'user.impersonate',
  // NOTE: /admin/security manages the admin's OWN passkeys — intentionally
  // unlisted so every authenticated admin keeps access to personal security.
};

// Exact match first, then longest-prefix (covers dynamic routes such as
// /admin/orders/[kind]/[id], which inherit their section permission).
export function requiredPermissionFor(pathname: string): string | undefined {
  if (ROUTE_PERMISSIONS[pathname]) return ROUTE_PERMISSIONS[pathname];
  let best: string | undefined;
  for (const prefix of Object.keys(ROUTE_PERMISSIONS)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best.length) best = prefix;
    }
  }
  return best ? ROUTE_PERMISSIONS[best] : undefined;
}
