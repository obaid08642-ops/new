import { SetMetadata } from '@nestjs/common';
import { UserRole } from './enums';

export enum Permission {
  DOCTOR_CREATE = 'doctor.create',
  DOCTOR_EDIT = 'doctor.edit',
  DOCTOR_READ = 'doctor.read',
  DOCTOR_DELETE = 'doctor.delete',
  
  APPOINTMENT_CREATE = 'appointment.create',
  APPOINTMENT_READ = 'appointment.read',
  APPOINTMENT_UPDATE = 'appointment.update',
  APPOINTMENT_DELETE = 'appointment.delete',

  PRESCRIPTION_CREATE = 'prescription.create',
  PRESCRIPTION_READ = 'prescription.read',
  PRESCRIPTION_UPDATE = 'prescription.update',
  PRESCRIPTION_DELETE = 'prescription.delete',

  PHARMACY_INVENTORY_EDIT = 'pharmacy.inventory.edit',
  PHARMACY_INVENTORY_READ = 'pharmacy.inventory.read',

  LAB_RESULT_UPLOAD = 'lab.result.upload',
  LAB_RESULT_READ = 'lab.result.read',

  RADIOLOGY_RESULT_UPLOAD = 'radiology.result.upload',
  RADIOLOGY_RESULT_READ = 'radiology.result.read',

  FACILITY_CREATE = 'facility.create',
  FACILITY_EDIT = 'facility.edit',
  FACILITY_READ = 'facility.read',
  FACILITY_DELETE = 'facility.delete',

  USER_IMPERSONATE = 'user.impersonate',
  USER_READ = 'user.read',
  USER_EDIT = 'user.edit',

  DATA_EXPORT = 'data.export',
  DATA_BACKUP = 'data.backup',

  // ── Enterprise Control Center (A1–A7) ──────────────────────
  RBAC_MANAGE = 'rbac.manage',
  DISPUTES_RESOLVE = 'disputes.resolve',
  COMMAND_CENTER_VIEW = 'command.center.view',

  ORDER_READ = 'order.read',
  ORDER_CANCEL = 'order.cancel',
  ORDER_REFUND = 'order.refund',
  ORDER_COMPENSATE = 'order.compensate',
  ORDER_REASSIGN = 'order.reassign',
  ORDER_SLA_EXTEND = 'order.sla.extend',
  ORDER_NOTE_ADD = 'order.note.add',

  FINANCE_READ = 'finance.read',
  FINANCE_PAYOUT_APPROVE = 'finance.payout.approve',
  FINANCE_CONFIG_EDIT = 'finance.config.edit',

  ANALYTICS_READ = 'analytics.read',
  ANALYTICS_EXPORT = 'analytics.export',
  SCHEDULED_REPORTS_MANAGE = 'reports.schedule.manage',

  CRM_READ = 'crm.read',
  GDPR_MANAGE = 'gdpr.manage',

  CMS_EDIT = 'cms.edit',
  COUPONS_MANAGE = 'coupons.manage',

  OPS_QUEUES_MANAGE = 'ops.queues.manage',
  OPS_CRONS_RUN = 'ops.crons.run',
  TRANSLATIONS_EDIT = 'translations.edit',
  SEO_CONTROL = 'seo.control',
}

/** Arabic labels for the permission catalog (RBAC editor UI). */
export const PERMISSION_LABELS_AR: Record<string, string> = {
  [Permission.DOCTOR_CREATE]: 'إنشاء طبيب',
  [Permission.DOCTOR_EDIT]: 'تعديل طبيب',
  [Permission.DOCTOR_READ]: 'قراءة الأطباء',
  [Permission.DOCTOR_DELETE]: 'حذف طبيب',
  [Permission.APPOINTMENT_CREATE]: 'إنشاء موعد',
  [Permission.APPOINTMENT_READ]: 'قراءة المواعيد',
  [Permission.APPOINTMENT_UPDATE]: 'تحديث موعد',
  [Permission.APPOINTMENT_DELETE]: 'حذف موعد',
  [Permission.PRESCRIPTION_CREATE]: 'إنشاء وصفة',
  [Permission.PRESCRIPTION_READ]: 'قراءة الوصفات',
  [Permission.PRESCRIPTION_UPDATE]: 'تحديث وصفة',
  [Permission.PRESCRIPTION_DELETE]: 'حذف وصفة',
  [Permission.PHARMACY_INVENTORY_EDIT]: 'تعديل مخزون صيدلية',
  [Permission.PHARMACY_INVENTORY_READ]: 'قراءة مخزون صيدلية',
  [Permission.LAB_RESULT_UPLOAD]: 'رفع نتيجة مختبر',
  [Permission.LAB_RESULT_READ]: 'قراءة نتائج مختبر',
  [Permission.RADIOLOGY_RESULT_UPLOAD]: 'رفع نتيجة أشعة',
  [Permission.RADIOLOGY_RESULT_READ]: 'قراءة نتائج أشعة',
  [Permission.FACILITY_CREATE]: 'إنشاء منشأة',
  [Permission.FACILITY_EDIT]: 'تعديل منشأة',
  [Permission.FACILITY_READ]: 'قراءة المنشآت',
  [Permission.FACILITY_DELETE]: 'حذف منشأة',
  [Permission.USER_IMPERSONATE]: 'انتحال هوية مستخدم',
  [Permission.USER_READ]: 'قراءة المستخدمين',
  [Permission.USER_EDIT]: 'تعديل مستخدم',
  [Permission.DATA_EXPORT]: 'تصدير بيانات',
  [Permission.DATA_BACKUP]: 'نسخ احتياطي',
  [Permission.RBAC_MANAGE]: 'إدارة الأدوار والصلاحيات',
  [Permission.DISPUTES_RESOLVE]: 'حسم النزاعات المالية',
  [Permission.COMMAND_CENTER_VIEW]: 'عرض مركز القيادة الحي',
  [Permission.ORDER_READ]: 'قراءة الطلبات',
  [Permission.ORDER_CANCEL]: 'إلغاء طلب',
  [Permission.ORDER_REFUND]: 'استرداد مالي',
  [Permission.ORDER_COMPENSATE]: 'تعويض محفظة',
  [Permission.ORDER_REASSIGN]: 'إعادة إسناد مزود',
  [Permission.ORDER_SLA_EXTEND]: 'تمديد SLA',
  [Permission.ORDER_NOTE_ADD]: 'إضافة ملاحظة داخلية للطلب',
  [Permission.FINANCE_READ]: 'قراءة المالية',
  [Permission.FINANCE_PAYOUT_APPROVE]: 'اعتماد مدفوعات المزودين',
  [Permission.FINANCE_CONFIG_EDIT]: 'تعديل إعدادات العمولات/VAT',
  [Permission.ANALYTICS_READ]: 'قراءة التحليلات',
  [Permission.ANALYTICS_EXPORT]: 'تصدير التقارير',
  [Permission.SCHEDULED_REPORTS_MANAGE]: 'إدارة التقارير المجدولة',
  [Permission.CRM_READ]: 'قراءة CRM 360',
  [Permission.GDPR_MANAGE]: 'إدارة خصوصية البيانات (GDPR)',
  [Permission.CMS_EDIT]: 'تحرير المحتوى (CMS)',
  [Permission.COUPONS_MANAGE]: 'إدارة الكوبونات والعروض',
  [Permission.OPS_QUEUES_MANAGE]: 'إدارة طوابير المهام',
  [Permission.OPS_CRONS_RUN]: 'تشغيل المهام الدورية يدويًا',
  [Permission.TRANSLATIONS_EDIT]: 'تحرير الترجمات',
  [Permission.SEO_CONTROL]: 'التحكم بنشر SEO',
};

export interface OwnershipOptions {
  model: string;       // Name of mongoose model, e.g. 'Appointment'
  ownerField: string;  // Field representing patient/user id, e.g. 'patient_id'
  providerField?: string; // Field representing provider or doctor id, e.g. 'doctor_id'
  paramName?: string;  // Request param containing resource ID, e.g. 'id'
}

export const CHECK_OWNERSHIP_KEY = 'checkOwnership';
export const CheckOwnership = (options: OwnershipOptions) => SetMetadata(CHECK_OWNERSHIP_KEY, options);

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.DOCTOR_CREATE, Permission.DOCTOR_EDIT, Permission.DOCTOR_READ,
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.PRESCRIPTION_READ,
    Permission.PHARMACY_INVENTORY_READ,
    Permission.LAB_RESULT_READ,
    Permission.RADIOLOGY_RESULT_READ,
    Permission.FACILITY_CREATE, Permission.FACILITY_EDIT, Permission.FACILITY_READ,
    Permission.USER_READ, Permission.USER_EDIT,
    Permission.DATA_EXPORT, Permission.DATA_BACKUP,
    // Enterprise baseline for platform admins (A1–A7)
    Permission.COMMAND_CENTER_VIEW, Permission.RBAC_MANAGE,
    Permission.DISPUTES_RESOLVE,
    Permission.ORDER_READ, Permission.ORDER_CANCEL, Permission.ORDER_REFUND,
    Permission.ORDER_COMPENSATE, Permission.ORDER_REASSIGN, Permission.ORDER_SLA_EXTEND, Permission.ORDER_NOTE_ADD,
    Permission.FINANCE_READ, Permission.FINANCE_PAYOUT_APPROVE, Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT,
    Permission.SCHEDULED_REPORTS_MANAGE, Permission.CRM_READ, Permission.GDPR_MANAGE,
    Permission.CMS_EDIT, Permission.COUPONS_MANAGE,
    Permission.OPS_QUEUES_MANAGE, Permission.OPS_CRONS_RUN,
    Permission.TRANSLATIONS_EDIT, Permission.SEO_CONTROL,
  ],
  [UserRole.SUPPORT_AGENT]: [
    Permission.DOCTOR_READ,
    Permission.APPOINTMENT_READ,
    Permission.PRESCRIPTION_READ,
    Permission.PHARMACY_INVENTORY_READ,
    Permission.LAB_RESULT_READ,
    Permission.RADIOLOGY_RESULT_READ,
    Permission.FACILITY_READ,
    Permission.USER_READ,
    Permission.USER_IMPERSONATE,
    Permission.ORDER_READ, Permission.CRM_READ, Permission.COMMAND_CENTER_VIEW,
  ],
  [UserRole.FINANCE]: [
    Permission.APPOINTMENT_READ,
    Permission.FACILITY_READ,
    Permission.DATA_EXPORT,
    Permission.FINANCE_READ, Permission.FINANCE_PAYOUT_APPROVE, Permission.FINANCE_CONFIG_EDIT,
    Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT, Permission.ORDER_READ,
  ],
  [UserRole.PATIENT]: [
    Permission.DOCTOR_READ,
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_UPDATE,
    Permission.PRESCRIPTION_READ,
    Permission.FACILITY_READ,
    Permission.USER_READ,
    Permission.USER_EDIT,
  ],
  [UserRole.DOCTOR]: [
    Permission.DOCTOR_READ, Permission.DOCTOR_EDIT,
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.PRESCRIPTION_CREATE, Permission.PRESCRIPTION_READ, Permission.PRESCRIPTION_UPDATE,
    Permission.FACILITY_READ,
    Permission.USER_READ,
  ],
  [UserRole.PHARMACIST]: [
    Permission.PRESCRIPTION_READ, Permission.PRESCRIPTION_UPDATE,
    Permission.PHARMACY_INVENTORY_EDIT, Permission.PHARMACY_INVENTORY_READ,
    Permission.USER_READ,
  ],
  [UserRole.PHARMACY]: [
    Permission.PRESCRIPTION_READ, Permission.PRESCRIPTION_UPDATE,
    Permission.PHARMACY_INVENTORY_EDIT, Permission.PHARMACY_INVENTORY_READ,
    Permission.USER_READ,
  ],
  [UserRole.HOSPITAL]: [
    Permission.DOCTOR_CREATE, Permission.DOCTOR_EDIT, Permission.DOCTOR_READ,
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.PRESCRIPTION_READ, Permission.PRESCRIPTION_CREATE,
    Permission.FACILITY_READ, Permission.FACILITY_EDIT,
    Permission.USER_READ,
  ],
  [UserRole.LAB]: [
    Permission.LAB_RESULT_UPLOAD, Permission.LAB_RESULT_READ,
    Permission.USER_READ,
  ],
  [UserRole.RADIOLOGY]: [
    Permission.RADIOLOGY_RESULT_UPLOAD, Permission.RADIOLOGY_RESULT_READ,
    Permission.USER_READ,
  ],
  [UserRole.NURSE]: [
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.PRESCRIPTION_READ,
    Permission.USER_READ,
  ],
  [UserRole.HOME_CARE]: [
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.USER_READ,
  ],
  [UserRole.PHYSIOTHERAPIST]: [
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.USER_READ,
  ],
  [UserRole.DELIVERY]: [
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.USER_READ,
  ],
  [UserRole.GUEST]: [],
  [UserRole.NURSING]: [
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.PRESCRIPTION_READ,
    Permission.USER_READ,
  ],
  [UserRole.AMBULANCE]: [
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.USER_READ,
  ],
  [UserRole.HOSPITAL_ADMIN]: [
    Permission.DOCTOR_CREATE, Permission.DOCTOR_EDIT, Permission.DOCTOR_READ,
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.PRESCRIPTION_READ, Permission.PRESCRIPTION_CREATE,
    Permission.FACILITY_READ, Permission.FACILITY_EDIT,
    Permission.USER_READ,
  ],
  [UserRole.BRANCH_ADMIN]: [
    Permission.DOCTOR_READ,
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.FACILITY_READ,
    Permission.USER_READ,
  ],
  [UserRole.RECEPTIONIST]: [
    Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
    Permission.USER_READ,
  ],
};

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
