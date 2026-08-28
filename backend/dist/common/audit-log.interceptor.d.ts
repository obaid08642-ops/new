import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Connection } from 'mongoose';
import { AuditService } from '../modules/security/security.module';
export declare const AUDITED_KEY = "audited";
export interface AuditMetadata {
    model: string;
    idParam?: string;
    action?: string;
}
export declare const Audited: (metadata: AuditMetadata) => import("@nestjs/common").CustomDecorator<string>;
export declare class AuditLogInterceptor implements NestInterceptor {
    private reflector;
    private connection;
    private auditService;
    constructor(reflector: Reflector, connection: Connection, auditService: AuditService);
    intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>>;
    private calculateDiff;
}
