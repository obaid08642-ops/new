import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getEffectiveRoles } from '../../../common/auth.guard';

export enum UserRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  PROVIDER = 'provider',
  PATIENT = 'patient',
}

export const Roles = (...roles: UserRole[]) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('roles', roles, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userRole = (user?.role || '').toLowerCase();
    const effectiveRoles = getEffectiveRoles(user);

    const roles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (roles && roles.length > 0) {
      return !!user && roles.map((r) => String(r).toLowerCase()).some((r) => effectiveRoles.includes(r));
    }

    // Systemic rule: every /admin/* route requires an admin role even if the
    // controller forgot @Roles (defense in depth — closes decorator drift).
    const path: string = request.route?.path || request.url || '';
    if (typeof path === 'string' && /\/admin(\/|$)/.test(path)) {
      return ['admin', 'super_admin'].includes(userRole);
    }
    return true;
  }
}
