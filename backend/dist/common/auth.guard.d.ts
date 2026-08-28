import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UserRole } from './enums';
import { ImpersonationSessionService } from './impersonation-session.service';
import { Connection } from 'mongoose';
export declare function invalidateDynamicRoleCache(): void;
export declare const PUBLIC_KEY = "isPublic";
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: Array<UserRole | string>) => import("@nestjs/common").CustomDecorator<string>;
export declare function normalizeEffectiveRole(value: unknown): string;
export declare function getEffectiveRoles(user: any): string[];
export declare class JwtAuthGuard implements CanActivate {
    private jwt;
    private reflector;
    private connection;
    private impersonationSessions;
    constructor(jwt: JwtService, reflector: Reflector, connection: Connection, impersonationSessions: ImpersonationSessionService);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
export declare const CurrentUser: (...dataOrPipes: (string | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>>)[]) => ParameterDecorator;
export declare class NoGuestsGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean;
}
