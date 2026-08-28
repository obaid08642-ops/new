"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePermissionRole = normalizePermissionRole;
exports.effectivePermissionRoles = effectivePermissionRoles;
exports.resolveEffectivePermissions = resolveEffectivePermissions;
exports.hasEffectivePermission = hasEffectivePermission;
const permissions_1 = require("./permissions");
const rbac_1 = require("./rbac");
function normalizePermissionRole(value) {
    const role = String(value || '').trim().toLowerCase();
    const aliases = {
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
function effectivePermissionRoles(identity) {
    return Array.from(new Set([
        normalizePermissionRole(identity?.role),
        normalizePermissionRole(identity?.provider_type),
        normalizePermissionRole(identity?.providerType),
    ].filter(Boolean)));
}
async function resolveEffectivePermissions(connection, identity) {
    const roles = effectivePermissionRoles(identity);
    const rawKeys = Array.isArray(identity?.custom_role_keys) ? identity.custom_role_keys : [];
    const customRoleKeys = Array.from(new Set(rawKeys.map(String).filter((key) => /^[a-z0-9_-]{3,40}$/.test(key))));
    let customPermissions = [];
    if (customRoleKeys.length) {
        try {
            const rolesFromDb = await connection.collection('admin_custom_roles')
                .find({ key: { $in: customRoleKeys } })
                .project({ permissions: 1 })
                .toArray();
            customPermissions = rolesFromDb.flatMap((role) => Array.isArray(role?.permissions) ? role.permissions.map(String) : []);
        }
        catch {
            customPermissions = [];
        }
    }
    const knownPermissions = new Set(Object.values(permissions_1.Permission));
    const directPermissions = Array.isArray(identity?.permissions)
        ? identity.permissions.map(String).filter((permission) => knownPermissions.has(permission))
        : [];
    const allowedCustomPermissions = customPermissions.filter((permission) => knownPermissions.has(permission));
    return (0, rbac_1.mergePermissions)(...roles.map((role) => permissions_1.ROLE_PERMISSIONS[role] || []), allowedCustomPermissions, directPermissions);
}
async function hasEffectivePermission(connection, identity, permission) {
    return (await resolveEffectivePermissions(connection, identity)).includes(permission);
}
//# sourceMappingURL=effective-permissions.js.map