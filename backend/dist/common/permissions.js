"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirePermissions = exports.PERMISSIONS_KEY = exports.ROLE_PERMISSIONS = exports.CheckOwnership = exports.CHECK_OWNERSHIP_KEY = exports.PERMISSION_LABELS_AR = exports.Permission = void 0;
const common_1 = require("@nestjs/common");
const enums_1 = require("./enums");
var Permission;
(function (Permission) {
    Permission["DOCTOR_CREATE"] = "doctor.create";
    Permission["DOCTOR_EDIT"] = "doctor.edit";
    Permission["DOCTOR_READ"] = "doctor.read";
    Permission["DOCTOR_DELETE"] = "doctor.delete";
    Permission["APPOINTMENT_CREATE"] = "appointment.create";
    Permission["APPOINTMENT_READ"] = "appointment.read";
    Permission["APPOINTMENT_UPDATE"] = "appointment.update";
    Permission["APPOINTMENT_DELETE"] = "appointment.delete";
    Permission["PRESCRIPTION_CREATE"] = "prescription.create";
    Permission["PRESCRIPTION_READ"] = "prescription.read";
    Permission["PRESCRIPTION_UPDATE"] = "prescription.update";
    Permission["PRESCRIPTION_DELETE"] = "prescription.delete";
    Permission["PHARMACY_INVENTORY_EDIT"] = "pharmacy.inventory.edit";
    Permission["PHARMACY_INVENTORY_READ"] = "pharmacy.inventory.read";
    Permission["LAB_RESULT_UPLOAD"] = "lab.result.upload";
    Permission["LAB_RESULT_READ"] = "lab.result.read";
    Permission["RADIOLOGY_RESULT_UPLOAD"] = "radiology.result.upload";
    Permission["RADIOLOGY_RESULT_READ"] = "radiology.result.read";
    Permission["FACILITY_CREATE"] = "facility.create";
    Permission["FACILITY_EDIT"] = "facility.edit";
    Permission["FACILITY_READ"] = "facility.read";
    Permission["FACILITY_DELETE"] = "facility.delete";
    Permission["USER_IMPERSONATE"] = "user.impersonate";
    Permission["CATALOG_READ"] = "catalog.read";
    Permission["CATALOG_CREATE"] = "catalog.create";
    Permission["CATALOG_UPDATE"] = "catalog.update";
    Permission["CATALOG_PRICE_WRITE"] = "catalog.price.write";
    Permission["CATALOG_IMPORT"] = "catalog.import";
    Permission["CATALOG_DELETE_RESTORE"] = "catalog.delete_restore";
    Permission["CATALOG_SHORTAGE_DECIDE"] = "catalog.shortage.decide";
    Permission["USER_READ"] = "user.read";
    Permission["USER_EDIT"] = "user.edit";
    Permission["DATA_EXPORT"] = "data.export";
    Permission["DATA_BACKUP"] = "data.backup";
    Permission["RBAC_MANAGE"] = "rbac.manage";
    Permission["DISPUTES_RESOLVE"] = "disputes.resolve";
    Permission["COMMAND_CENTER_VIEW"] = "command.center.view";
    Permission["ORDER_READ"] = "order.read";
    Permission["ORDER_CANCEL"] = "order.cancel";
    Permission["ORDER_REFUND"] = "order.refund";
    Permission["ORDER_COMPENSATE"] = "order.compensate";
    Permission["ORDER_REASSIGN"] = "order.reassign";
    Permission["ORDER_SLA_EXTEND"] = "order.sla.extend";
    Permission["ORDER_NOTE_ADD"] = "order.note.add";
    Permission["FINANCE_READ"] = "finance.read";
    Permission["FINANCE_PAYOUT_APPROVE"] = "finance.payout.approve";
    Permission["FINANCE_CONFIG_EDIT"] = "finance.config.edit";
    Permission["ANALYTICS_READ"] = "analytics.read";
    Permission["ANALYTICS_EXPORT"] = "analytics.export";
    Permission["SCHEDULED_REPORTS_MANAGE"] = "reports.schedule.manage";
    Permission["CRM_READ"] = "crm.read";
    Permission["GDPR_MANAGE"] = "gdpr.manage";
    Permission["CMS_EDIT"] = "cms.edit";
    Permission["COUPONS_MANAGE"] = "coupons.manage";
    Permission["OPS_QUEUES_MANAGE"] = "ops.queues.manage";
    Permission["OPS_CRONS_RUN"] = "ops.crons.run";
    Permission["TRANSLATIONS_EDIT"] = "translations.edit";
    Permission["SEO_CONTROL"] = "seo.control";
})(Permission || (exports.Permission = Permission = {}));
exports.PERMISSION_LABELS_AR = {
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
    [Permission.CATALOG_READ]: 'قراءة كتالوج الأدوية',
    [Permission.CATALOG_CREATE]: 'إنشاء صنف في الكتالوج',
    [Permission.CATALOG_UPDATE]: 'تعديل صنف في الكتالوج',
    [Permission.CATALOG_PRICE_WRITE]: 'تغيير سعر صنف',
    [Permission.CATALOG_IMPORT]: 'استيراد الكتالوج',
    [Permission.CATALOG_DELETE_RESTORE]: 'حذف أو استعادة صنف',
    [Permission.CATALOG_SHORTAGE_DECIDE]: 'حسم نقص صنف',
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
exports.CHECK_OWNERSHIP_KEY = 'checkOwnership';
const CheckOwnership = (options) => (0, common_1.SetMetadata)(exports.CHECK_OWNERSHIP_KEY, options);
exports.CheckOwnership = CheckOwnership;
exports.ROLE_PERMISSIONS = {
    [enums_1.UserRole.SUPER_ADMIN]: Object.values(Permission),
    [enums_1.UserRole.ADMIN]: [
        Permission.DOCTOR_CREATE, Permission.DOCTOR_EDIT, Permission.DOCTOR_READ,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.PRESCRIPTION_READ,
        Permission.PHARMACY_INVENTORY_READ,
        Permission.LAB_RESULT_READ,
        Permission.RADIOLOGY_RESULT_READ,
        Permission.FACILITY_CREATE, Permission.FACILITY_EDIT, Permission.FACILITY_READ,
        Permission.USER_READ, Permission.USER_EDIT,
        Permission.DATA_EXPORT, Permission.DATA_BACKUP,
        Permission.COMMAND_CENTER_VIEW, Permission.RBAC_MANAGE,
        Permission.DISPUTES_RESOLVE,
        Permission.ORDER_READ, Permission.ORDER_CANCEL, Permission.ORDER_REFUND,
        Permission.ORDER_COMPENSATE, Permission.ORDER_REASSIGN, Permission.ORDER_SLA_EXTEND, Permission.ORDER_NOTE_ADD,
        Permission.FINANCE_READ, Permission.FINANCE_PAYOUT_APPROVE, Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT,
        Permission.SCHEDULED_REPORTS_MANAGE, Permission.CRM_READ, Permission.GDPR_MANAGE,
        Permission.CMS_EDIT, Permission.COUPONS_MANAGE,
        Permission.OPS_QUEUES_MANAGE, Permission.OPS_CRONS_RUN,
        Permission.TRANSLATIONS_EDIT, Permission.SEO_CONTROL,
        Permission.CATALOG_READ, Permission.CATALOG_CREATE, Permission.CATALOG_UPDATE,
        Permission.CATALOG_PRICE_WRITE, Permission.CATALOG_IMPORT,
        Permission.CATALOG_DELETE_RESTORE, Permission.CATALOG_SHORTAGE_DECIDE,
    ],
    [enums_1.UserRole.SUPPORT_AGENT]: [
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
    [enums_1.UserRole.FINANCE]: [
        Permission.APPOINTMENT_READ,
        Permission.FACILITY_READ,
        Permission.DATA_EXPORT,
        Permission.FINANCE_READ, Permission.FINANCE_PAYOUT_APPROVE, Permission.FINANCE_CONFIG_EDIT,
        Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT, Permission.ORDER_READ,
    ],
    [enums_1.UserRole.PATIENT]: [
        Permission.DOCTOR_READ,
        Permission.APPOINTMENT_CREATE,
        Permission.APPOINTMENT_READ,
        Permission.APPOINTMENT_UPDATE,
        Permission.PRESCRIPTION_READ,
        Permission.FACILITY_READ,
        Permission.USER_READ,
        Permission.USER_EDIT,
    ],
    [enums_1.UserRole.DOCTOR]: [
        Permission.DOCTOR_READ, Permission.DOCTOR_EDIT,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.PRESCRIPTION_CREATE, Permission.PRESCRIPTION_READ, Permission.PRESCRIPTION_UPDATE,
        Permission.FACILITY_READ,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.PHARMACIST]: [
        Permission.PRESCRIPTION_READ, Permission.PRESCRIPTION_UPDATE,
        Permission.PHARMACY_INVENTORY_EDIT, Permission.PHARMACY_INVENTORY_READ,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.PHARMACY]: [
        Permission.PRESCRIPTION_READ, Permission.PRESCRIPTION_UPDATE,
        Permission.PHARMACY_INVENTORY_EDIT, Permission.PHARMACY_INVENTORY_READ,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.HOSPITAL]: [
        Permission.DOCTOR_CREATE, Permission.DOCTOR_EDIT, Permission.DOCTOR_READ,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.PRESCRIPTION_READ, Permission.PRESCRIPTION_CREATE,
        Permission.FACILITY_READ, Permission.FACILITY_EDIT,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.LAB]: [
        Permission.LAB_RESULT_UPLOAD, Permission.LAB_RESULT_READ,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.RADIOLOGY]: [
        Permission.RADIOLOGY_RESULT_UPLOAD, Permission.RADIOLOGY_RESULT_READ,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.NURSE]: [
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.PRESCRIPTION_READ,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.HOME_CARE]: [
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.PHYSIOTHERAPIST]: [
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.DELIVERY]: [
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.GUEST]: [],
    [enums_1.UserRole.NURSING]: [
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.PRESCRIPTION_READ,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.AMBULANCE]: [
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.HOSPITAL_ADMIN]: [
        Permission.DOCTOR_CREATE, Permission.DOCTOR_EDIT, Permission.DOCTOR_READ,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.PRESCRIPTION_READ, Permission.PRESCRIPTION_CREATE,
        Permission.FACILITY_READ, Permission.FACILITY_EDIT,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.BRANCH_ADMIN]: [
        Permission.DOCTOR_READ,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.FACILITY_READ,
        Permission.USER_READ,
    ],
    [enums_1.UserRole.RECEPTIONIST]: [
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_UPDATE,
        Permission.USER_READ,
    ],
};
exports.PERMISSIONS_KEY = 'permissions';
const RequirePermissions = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.RequirePermissions = RequirePermissions;
//# sourceMappingURL=permissions.js.map