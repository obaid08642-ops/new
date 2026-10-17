import { Connection } from 'mongoose';
import { Permission, ROLE_PERMISSIONS } from './permissions';
import { mergePermissions } from './rbac';

export function normalizePermissionRole(value: unknown): string {
  const role = String(value || '').trim().toLowerCase();
  const aliases: Record<string, string> = {
    laboratory: 'lab',
    lab: 'lab',
    radiology_center: 'radiology',
    radiology: 'radiology',
    hospital_admin: 'hospital_admin',
    pharmacy: 'pharmacy',
    pharmacist: 'pharmacist',
    homecare: 'home_care',
    home_care: 'home_care',
    nursing: 'nursing',
    nurse: 'nurse',
  };
  return aliases[role] || role;
}

export function effectivePermissionRoles(identity: any): string[] {
  return Array.from(new Set([
    normalizePermissionRole(identity?.role),
    normalizePermissionRole(identity?.provider_type),
    normalizePermissionRole(identity?.providerType),
  ].filter(Boolean)));
}

/**
 * The owner account: the designated owner email (the same identity the owner-only sub-admin routes check) on an
 * admin account. Set ADMIN_PASSKEY_EMAIL in each environment.
 */
export function ownerEmail(): string {
  return (process.env.ADMIN_PASSKEY_EMAIL || 'Obaid08642@gmail.com').trim().toLowerCase();
}

/** Staff accounts whose grants live on the user record (custom roles, direct grants), not in the token. */
const STAFF_ROLES = new Set(['admin', 'super_admin', 'support_agent', 'finance']);
const ADMIN_ROLES = new Set(['admin', 'super_admin']);

export interface StaffAccess { permissions: string[]; is_owner: boolean }

/**
 * Owner decision 29: admin roles are restrictive. An admin's effective permissions are the union of the
 * permissions of the custom roles assigned to them (plus catalogued grants stored on their own record); the built-in
 * `admin` role grants none. The owner (super_admin, or the designated owner email on an admin account) holds every
 * permission. Grants are read from the user record on every check, so a role change applies at once; when that read
 * fails nothing is granted beyond the static role set.
 */
export async function resolveStaffAccess(connection: Connection, identity: any): Promise<StaffAccess> {
  const roles = effectivePermissionRoles(identity);
  const knownPermissions = new Set<string>(Object.values(Permission));
  if (roles.includes('super_admin')) return { permissions: [...knownPermissions], is_owner: true };

  let rawKeys: unknown[] = Array.isArray(identity?.custom_role_keys) ? identity.custom_role_keys : [];
  let rawDirect: unknown[] = Array.isArray(identity?.permissions) ? identity.permissions : [];
  let email = typeof identity?.email === 'string' ? identity.email : '';
  const id = identity?.id || identity?.sub;
  if (id && roles.some((r) => STAFF_ROLES.has(r))) {
    let record: any = null;
    try {
      record = await connection.collection('users').findOne(
        { id: { $eq: String(id) } },
        { projection: { email: 1, custom_role_keys: 1, permissions: 1 } },
      );
    } catch {
      record = null;
    }
    // The stored record is the source of truth for staff grants; a token never carries them.
    rawKeys = Array.isArray(record?.custom_role_keys) ? record.custom_role_keys : [];
    rawDirect = Array.isArray(record?.permissions) ? record.permissions : [];
    email = typeof record?.email === 'string' ? record.email : '';
  }
  if (roles.some((r) => ADMIN_ROLES.has(r)) && email && email.trim().toLowerCase() === ownerEmail()) {
    return { permissions: [...knownPermissions], is_owner: true };
  }

  const customRoleKeys = Array.from(new Set(rawKeys.map(String).filter((key) => /^[a-z0-9_-]{3,40}$/.test(key))));
  let customPermissions: string[] = [];
  if (customRoleKeys.length) {
    try {
      const rolesFromDb: any[] = await connection.collection('admin_custom_roles')
        .find({ key: { $in: customRoleKeys } })
        .project({ permissions: 1 })
        .toArray();
      customPermissions = rolesFromDb.flatMap((role) => Array.isArray(role?.permissions) ? role.permissions.map(String) : []);
    } catch {
      // Missing/unavailable role data must never grant a custom permission.
      customPermissions = [];
    }
  }

  const directPermissions = rawDirect.map(String).filter((permission: string) => knownPermissions.has(permission));
  const allowedCustomPermissions = customPermissions.filter((permission) => knownPermissions.has(permission));

  return {
    permissions: mergePermissions(
      ...roles.map((role) => ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || []),
      allowedCustomPermissions,
      directPermissions,
    ),
    is_owner: false,
  };
}

export async function resolveEffectivePermissions(connection: Connection, identity: any): Promise<string[]> {
  return (await resolveStaffAccess(connection, identity)).permissions;
}

export async function hasEffectivePermission(connection: Connection, identity: any, permission: Permission): Promise<boolean> {
  return (await resolveEffectivePermissions(connection, identity)).includes(permission);
}
