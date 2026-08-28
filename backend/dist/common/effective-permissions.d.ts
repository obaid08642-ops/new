import { Connection } from 'mongoose';
import { Permission } from './permissions';
export declare function normalizePermissionRole(value: unknown): string;
export declare function effectivePermissionRoles(identity: any): string[];
export declare function resolveEffectivePermissions(connection: Connection, identity: any): Promise<string[]>;
export declare function hasEffectivePermission(connection: Connection, identity: any, permission: Permission): Promise<boolean>;
