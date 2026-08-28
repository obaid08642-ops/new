import { UserRole } from './enums';
export declare enum Permission {
    DOCTOR_CREATE = "doctor.create",
    DOCTOR_EDIT = "doctor.edit",
    DOCTOR_READ = "doctor.read",
    DOCTOR_DELETE = "doctor.delete",
    APPOINTMENT_CREATE = "appointment.create",
    APPOINTMENT_READ = "appointment.read",
    APPOINTMENT_UPDATE = "appointment.update",
    APPOINTMENT_DELETE = "appointment.delete",
    PRESCRIPTION_CREATE = "prescription.create",
    PRESCRIPTION_READ = "prescription.read",
    PRESCRIPTION_UPDATE = "prescription.update",
    PRESCRIPTION_DELETE = "prescription.delete",
    PHARMACY_INVENTORY_EDIT = "pharmacy.inventory.edit",
    PHARMACY_INVENTORY_READ = "pharmacy.inventory.read",
    LAB_RESULT_UPLOAD = "lab.result.upload",
    LAB_RESULT_READ = "lab.result.read",
    RADIOLOGY_RESULT_UPLOAD = "radiology.result.upload",
    RADIOLOGY_RESULT_READ = "radiology.result.read",
    FACILITY_CREATE = "facility.create",
    FACILITY_EDIT = "facility.edit",
    FACILITY_READ = "facility.read",
    FACILITY_DELETE = "facility.delete",
    USER_IMPERSONATE = "user.impersonate",
    CATALOG_READ = "catalog.read",
    CATALOG_CREATE = "catalog.create",
    CATALOG_UPDATE = "catalog.update",
    CATALOG_PRICE_WRITE = "catalog.price.write",
    CATALOG_IMPORT = "catalog.import",
    CATALOG_DELETE_RESTORE = "catalog.delete_restore",
    CATALOG_SHORTAGE_DECIDE = "catalog.shortage.decide",
    USER_READ = "user.read",
    USER_EDIT = "user.edit",
    DATA_EXPORT = "data.export",
    DATA_BACKUP = "data.backup",
    RBAC_MANAGE = "rbac.manage",
    DISPUTES_RESOLVE = "disputes.resolve",
    COMMAND_CENTER_VIEW = "command.center.view",
    ORDER_READ = "order.read",
    ORDER_CANCEL = "order.cancel",
    ORDER_REFUND = "order.refund",
    ORDER_COMPENSATE = "order.compensate",
    ORDER_REASSIGN = "order.reassign",
    ORDER_SLA_EXTEND = "order.sla.extend",
    ORDER_NOTE_ADD = "order.note.add",
    FINANCE_READ = "finance.read",
    FINANCE_PAYOUT_APPROVE = "finance.payout.approve",
    FINANCE_CONFIG_EDIT = "finance.config.edit",
    ANALYTICS_READ = "analytics.read",
    ANALYTICS_EXPORT = "analytics.export",
    SCHEDULED_REPORTS_MANAGE = "reports.schedule.manage",
    CRM_READ = "crm.read",
    GDPR_MANAGE = "gdpr.manage",
    CMS_EDIT = "cms.edit",
    COUPONS_MANAGE = "coupons.manage",
    OPS_QUEUES_MANAGE = "ops.queues.manage",
    OPS_CRONS_RUN = "ops.crons.run",
    TRANSLATIONS_EDIT = "translations.edit",
    SEO_CONTROL = "seo.control"
}
export declare const PERMISSION_LABELS_AR: Record<string, string>;
export interface OwnershipOptions {
    model: string;
    ownerField: string;
    providerField?: string;
    paramName?: string;
}
export declare const CHECK_OWNERSHIP_KEY = "checkOwnership";
export declare const CheckOwnership: (options: OwnershipOptions) => import("@nestjs/common").CustomDecorator<string>;
export declare const ROLE_PERMISSIONS: Record<UserRole, string[]>;
export declare const PERMISSIONS_KEY = "permissions";
export declare const RequirePermissions: (...permissions: Permission[]) => import("@nestjs/common").CustomDecorator<string>;
