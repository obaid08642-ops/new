// @ts-nocheck
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
}

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
    Permission.DATA_EXPORT, Permission.DATA_BACKUP
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
  ],
  [UserRole.FINANCE]: [
    Permission.APPOINTMENT_READ,
    Permission.FACILITY_READ,
    Permission.DATA_EXPORT,
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
};

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
