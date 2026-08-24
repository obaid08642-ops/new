import { logger } from '../../../services/Logger';
import { UserRole } from '../../domain/entities';

export type PermissionKey =
  | 'view_medical_records'
  | 'edit_medical_records'
  | 'prescribe_medication'
  | 'view_orders'
  | 'manage_pharmacy_inventory'
  | 'access_admin_dashboard'
  | 'manage_users'
  | 'manage_roles';

export class RoleManager {
  private log = logger.scope('RoleManager');

  // Define RBAC matrix
  private rolePermissions: Record<UserRole, PermissionKey[]> = {
    guest: [],
    patient: ['view_medical_records', 'view_orders'],
    doctor: ['view_medical_records', 'edit_medical_records', 'prescribe_medication'],
    pharmacy: ['view_orders', 'manage_pharmacy_inventory'],
    nurse: ['view_medical_records', 'edit_medical_records'],
    lab: ['view_medical_records', 'edit_medical_records'],
    insurance: ['view_medical_records'],
    admin: [
      'view_medical_records', 'edit_medical_records', 'view_orders',
      'access_admin_dashboard', 'manage_users'
    ],
  };

  /**
   * Check if a role has a specific permission
   */
  public hasPermission(role: UserRole, permission: PermissionKey): boolean {
    const permissions = this.rolePermissions[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Get all permissions for a specific role
   */
  public getPermissions(role: UserRole): PermissionKey[] {
    return this.rolePermissions[role] || [];
  }

  /**
   * Check if a user has sufficient clearance
   */
  public canAccess(role: UserRole, requiredPermissions: PermissionKey[]): boolean {
    const permissions = this.getPermissions(role);
    return requiredPermissions.every(p => permissions.includes(p));
  }
}
