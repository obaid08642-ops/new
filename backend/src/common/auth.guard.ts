import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from './enums';
import { Permission, ROLE_PERMISSIONS, PERMISSIONS_KEY, CHECK_OWNERSHIP_KEY, OwnershipOptions } from './permissions';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
    @InjectConnection() private connection: Connection
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: any; impersonator?: any; auditInfo?: any }>();
    
    // Extract IP and User Agent
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    req.auditInfo = { ip, userAgent };

    const auth = req.headers.authorization || '';
    let token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    // Fallback to HttpOnly cookie for Web Dashboard
    if (!token && req.cookies && req.cookies.nabd_admin_token) {
      token = req.cookies.nabd_admin_token;
    }
    
    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Missing token');
    }

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });
    } catch (e) {
      if (isPublic) return true;
      throw new UnauthorizedException('Invalid token');
    }

    // Attach original user payload to request
    req.user = payload;

    // Check for Impersonation header
    const impersonateUserId = req.headers['x-impersonate-user-id'] as string;
    if (impersonateUserId) {
      // 1. Verify that the original user is authorized to impersonate (is ADMIN or SUPER_ADMIN or has user.impersonate permission)
      const userPermissions = [
        ...(ROLE_PERMISSIONS[payload.role as UserRole] || []),
        ...(payload.permissions || [])
      ];
      
      const canImpersonate = payload.role === UserRole.SUPER_ADMIN || 
                             payload.role === UserRole.ADMIN || 
                             userPermissions.includes(Permission.USER_IMPERSONATE);
      
      if (!canImpersonate) {
        throw new ForbiddenException('You do not have permission to impersonate users');
      }

      // 2. Fetch target user from DB
      const targetUser = (await this.connection.model('User').findOne({ id: impersonateUserId }).lean()) as any;
      if (!targetUser) {
        throw new NotFoundException('Target user for impersonation not found');
      }

      // 3. Log impersonation event to AuditLog
      try {
        await this.connection.model('AuditLog').create({
          action: 'admin_impersonation',
          user_id: payload.id,
          role: payload.role,
          ip,
          user_agent: userAgent,
          resource_kind: 'User',
          resource_id: targetUser.id,
          severity: 'warn',
          details: {
            impersonator_id: payload.id,
            impersonator_email: payload.email,
            impersonated_id: targetUser.id,
            impersonated_role: targetUser.role
          }
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to log impersonation', err);
      }

      // 4. Substitute req.user with target user's details and preserve original in req.impersonator
      req.impersonator = payload;
      req.user = {
        id: targetUser.id,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        full_name: targetUser.full_name,
        permissions: targetUser.permissions || [],
        parent_provider_account_id: targetUser.parent_provider_account_id
      };
      
      // Update payload to reflect impersonated user for role/permission checking
      payload = req.user;
    }

    // Role check (fallback compatibility)
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (roles && roles.length && !roles.includes(payload.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    // Fine-grained Permission check
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (requiredPermissions && requiredPermissions.length) {
      const userPermissions = [
        ...(ROLE_PERMISSIONS[payload.role as UserRole] || []),
        ...(payload.permissions || [])
      ];
      
      const hasPermission = requiredPermissions.every(p => userPermissions.includes(p));
      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Ownership Isolation check
    const ownershipOptions = this.reflector.getAllAndOverride<OwnershipOptions>(CHECK_OWNERSHIP_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (ownershipOptions && payload.role !== UserRole.SUPER_ADMIN && payload.role !== UserRole.ADMIN) {
      const resourceId = req.params[ownershipOptions.paramName || 'id'] || 
                         req.query[ownershipOptions.paramName || 'id'] || 
                         req.body[ownershipOptions.paramName || 'id'];
      
      if (resourceId) {
        const modelName = ownershipOptions.model;
        const model = this.connection.model(modelName);
        if (model) {
          // Attempt string match or ObjectId match
          const query = { id: resourceId };
          const resource = (await model.findOne(query).lean()) as any;
          if (!resource) {
            throw new NotFoundException(`Resource ${modelName} not found`);
          }

          const userId = payload.id;
          const facilityId = payload.facility_id || payload.parent_provider_account_id;

          const isOwner = resource[ownershipOptions.ownerField] === userId;
          let isProvider = false;
          
          if (ownershipOptions.providerField) {
            const pField = resource[ownershipOptions.providerField];
            isProvider = pField === userId || (facilityId && pField === facilityId);
          }

          if (!isOwner && !isProvider) {
            throw new ForbiddenException('Access denied: You do not own this resource');
          }
        }
      }
    }

    return true;
  }
}

import { createParamDecorator } from '@nestjs/common';
export const CurrentUser = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return data ? req.user?.[data] : req.user;
});
