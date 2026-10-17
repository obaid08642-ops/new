import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AppModule } from '../app.module';
import { PUBLIC_KEY, ROLES_KEY, SELF_SERVICE_KEY } from './auth.guard';
import { Permission, PERMISSIONS_KEY, ROLE_PERMISSIONS } from './permissions';
import { UserRole } from './enums';

// Owner decision 29: custom admin roles are restrictive, so every admin write route must name the permission it
// needs. A route that only says @Roles(ADMIN) would be open to every admin, whatever their roles. This spec walks
// every controller registered in AppModule and fails when an admin write route names no permission.
type Ctor = { prototype: Record<string, unknown>; name: string };
const WRITE = new Set<number>([RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE]);
const VERB: Record<number, string> = { [RequestMethod.POST]: 'POST', [RequestMethod.PUT]: 'PUT', [RequestMethod.PATCH]: 'PATCH', [RequestMethod.DELETE]: 'DELETE' };
const ADMIN_ROLES = new Set<string>([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
// Routes where each admin acts only on their own account. They need no permission: an admin with no role must still
// enrol and lock their own device, or the device allow-list would lock them out of the panel.
const OWN_ACCOUNT_ROUTES = new Set<string>([
  'AdminDevicesController.enroll',
  // D-35: approve and confirm read the request by id AND the caller's user_id (admin-device-approval.service.ts),
  // so an admin only ever approves or confirms a new device of their own account.
  'AdminDevicesController.approve',
  'AdminDevicesController.confirm',
  'AdminDevicesController.revoke',
  'AdminDevicesController.setLock',
]);

function collectControllers(): Ctor[] {
  const seen = new Set<unknown>();
  const out = new Set<Ctor>();
  const visit = (mod: unknown): void => {
    if (!mod || seen.has(mod)) return;
    seen.add(mod);
    const record = mod as { module?: unknown; imports?: unknown[]; controllers?: Ctor[] };
    const target = typeof mod === 'function' ? mod : record.module;
    if (record.module) {
      for (const c of record.controllers || []) out.add(c);
      for (const i of record.imports || []) visit(i);
    }
    if (typeof target !== 'function') return;
    for (const c of (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, target) as Ctor[] | undefined) || []) out.add(c);
    for (const i of (Reflect.getMetadata(MODULE_METADATA.IMPORTS, target) as unknown[] | undefined) || []) {
      const resolved = i && typeof i === 'object' && 'forwardRef' in (i as object) ? (i as { forwardRef: () => unknown }).forwardRef() : i;
      visit(resolved);
    }
  };
  visit(AppModule);
  return [...out];
}

const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === 'string' ? [v] : []);
const join = (...parts: string[]): string => '/' + parts.map((p) => p.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');

export interface AdminWriteRoute { label: string; permissions: string[] }

export function adminWriteRoutes(): AdminWriteRoute[] {
  const routes: AdminWriteRoute[] = [];
  for (const ctrl of collectControllers()) {
    const classPaths = asList(Reflect.getMetadata(PATH_METADATA, ctrl));
    const classRoles = asList(Reflect.getMetadata(ROLES_KEY, ctrl));
    const classPerms = asList(Reflect.getMetadata(PERMISSIONS_KEY, ctrl));
    const classPublic = !!Reflect.getMetadata(PUBLIC_KEY, ctrl);
    const classSelf = !!Reflect.getMetadata(SELF_SERVICE_KEY, ctrl);
    let proto: object | null = ctrl.prototype;
    const handlers = new Map<string, Function>();
    while (proto && proto !== Object.prototype) {
      for (const n of Object.getOwnPropertyNames(proto)) {
        // Read the descriptor, never the property: getters on a controller prototype need an instance.
        const value = Object.getOwnPropertyDescriptor(proto, n)?.value as unknown;
        if (n !== 'constructor' && typeof value === 'function' && !handlers.has(n)) handlers.set(n, value);
      }
      proto = Object.getPrototypeOf(proto);
    }
    for (const [name, fn] of handlers) {
      const method = Reflect.getMetadata(METHOD_METADATA, fn) as number | undefined;
      if (method === undefined || !WRITE.has(method)) continue;
      const handlerRoles = Reflect.getMetadata(ROLES_KEY, fn) as unknown;
      const roles = handlerRoles !== undefined ? asList(handlerRoles) : classRoles;
      const handlerPerms = Reflect.getMetadata(PERMISSIONS_KEY, fn) as unknown;
      const permissions = handlerPerms !== undefined ? asList(handlerPerms) : classPerms;
      const isPublic = (Reflect.getMetadata(PUBLIC_KEY, fn) as boolean | undefined) ?? classPublic;
      const isSelf = (Reflect.getMetadata(SELF_SERVICE_KEY, fn) as boolean | undefined) ?? classSelf;
      if (isPublic) continue;
      const adminOnly = roles.length > 0 && roles.every((r) => ADMIN_ROLES.has(r));
      const paths = classPaths.length ? classPaths : [''];
      const methodPaths = asList(Reflect.getMetadata(PATH_METADATA, fn));
      const full = paths.flatMap((cp) => (methodPaths.length ? methodPaths : ['']).map((mp) => join(cp, mp)));
      const underAdmin = full.some((p) => /^\/admin(\/|$)/.test(p));
      // Admin write routes: guarded only by an admin role, or living under /admin (unless declared self-service
      // for a non-admin actor, e.g. a provider uploading their own document).
      if (!adminOnly && !(underAdmin && !isSelf && (roles.length === 0 || roles.some((r) => ADMIN_ROLES.has(r))))) continue;
      if (OWN_ACCOUNT_ROUTES.has(`${ctrl.name}.${name}`)) continue;
      routes.push({ label: `${ctrl.name}.${name} ${VERB[method]} ${full.join(' | ')}`, permissions });
    }
  }
  return routes;
}

describe('admin write routes name a permission (owner decision 29)', () => {
  const routes = adminWriteRoutes();

  it('finds the admin write surface', () => {
    expect(routes.length).toBeGreaterThan(150);
  });

  it('every admin write route names at least one permission', () => {
    expect(routes.filter((r) => r.permissions.length === 0).map((r) => r.label).sort()).toEqual([]);
  });

  it('every named permission exists in the permission vocabulary', () => {
    const known = new Set<string>(Object.values(Permission));
    expect(routes.flatMap((r) => r.permissions.filter((p) => !known.has(p)).map((p) => `${r.label}: ${p}`))).toEqual([]);
  });

  it('the built-in admin role grants no permission: an admin holds only what their custom roles grant', () => {
    expect(ROLE_PERMISSIONS[UserRole.ADMIN]).toEqual([]);
  });

  it('the owner (super_admin) holds every permission', () => {
    expect([...ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]].sort()).toEqual([...Object.values(Permission)].sort());
  });
});
