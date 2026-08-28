import { NestMiddleware, MiddlewareConsumer } from '@nestjs/common';
import { Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
export declare class AuditService {
    private logs;
    constructor(logs: Model<any>);
    write(entry: {
        action: string;
        user_id?: string;
        role?: string;
        ip?: string;
        user_agent?: string;
        resource_kind?: string;
        resource_id?: string;
        details?: any;
        severity?: 'info' | 'warn' | 'critical';
        correlation_id?: string;
    }): Promise<void>;
    query(filter?: any, limit?: number): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    queryAdmin(options: {
        search?: string;
        role?: string;
        severity?: string;
        user_id?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        logs: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    queryPersonal(userId: string, options: {
        page?: number;
        limit?: number;
    }): Promise<{
        logs: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    onRegister(p: any): Promise<void>;
    onLogin(p: any): Promise<void>;
    onLogout(p: any): Promise<void>;
    onBookingCreated(p: any): Promise<void>;
    onBookingCancelled(p: any): Promise<void>;
    onPaymentCompleted(p: any): Promise<void>;
    onUploadCompleted(p: any): Promise<void>;
    onUploadRejected(p: any): Promise<void>;
    onScheduleUpdated(p: any): Promise<void>;
    onCallAccepted(p: any): Promise<void>;
    onCallRejected(p: any): Promise<void>;
    onPrescriptionCreated(p: any): Promise<void>;
    onPrescriptionUpdated(p: any): Promise<void>;
    onProviderProfileUpdated(p: any): Promise<void>;
    onAdminUserUpdated(p: any): Promise<void>;
    onAdminProviderApproved(p: any): Promise<void>;
    onAdminProviderRejected(p: any): Promise<void>;
    onAdminCommissionUpdated(p: any): Promise<void>;
    onFeatureFlagUpdated(p: any): Promise<void>;
    onLoginFailed(p: any): Promise<void>;
    onRefund(p: any): Promise<void>;
    onForceCancel(p: any): Promise<void>;
    onFinanceOpExecuted(p: any): Promise<void>;
    onFinanceOpRejected(p: any): Promise<void>;
    onInsuranceDecided(p: any): Promise<void>;
    onMedicalReportCreated(p: any): Promise<void>;
    onLabReportUploaded(p: any): Promise<void>;
    onRadiologyReportPublished(p: any): Promise<void>;
    onUserDeleted(p: any): Promise<void>;
}
export declare class TracingMiddleware implements NestMiddleware {
    use(req: Request & {
        correlation_id?: string;
    }, res: Response, next: NextFunction): void;
}
export declare class SecurityHeadersMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void;
}
export declare class AuditController {
    private svc;
    constructor(svc: AuditService);
    admin(search?: string, role?: string, severity?: string, userId?: string, page?: number, limit?: number): Promise<{
        logs: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    myActivity(u: any, page?: number, limit?: number): Promise<{
        logs: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    recent(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    critical(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
export declare class SecurityModule {
    configure(consumer: MiddlewareConsumer): void;
}
