import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare enum UserRole {
    ADMIN = "admin",
    SUPER_ADMIN = "super_admin",
    PROVIDER = "provider",
    PATIENT = "patient"
}
export declare const Roles: (...roles: UserRole[]) => (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare class RolesGuard implements CanActivate {
    private reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
