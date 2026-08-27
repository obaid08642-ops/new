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

export async function resolveEffectivePermissions(connection: Connection, identity: any): Promise<string[]> {
  const roles = effectivePermissionRoles(identity);
  const rawKeys = Array.isArray(identity?.custom_role_keys) ? identity.custom_role_keys : [];
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

  const knownPermissions = new Set<string>(Object.values(Permission));
  const directPermissions = Array.isArray(identity?.permissions)
    ? identity.permissions.map(String).filter((permission: string) => knownPermissions.has(permission))
    : [];
  const allowedCustomPermissions = customPermissions.filter((permission) => knownPermissions.has(permission));

  return mergePermissions(
    ...roles.map((role) => ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || []),
    allowedCustomPermissions,
    directPermissions,
  );
}

export async function hasEffectivePermission(connection: Connection, identity: any, permission: Permission): Promise<boolean> {
  return (await resolveEffectivePermissions(connection, identity)).includes(permission);
}
