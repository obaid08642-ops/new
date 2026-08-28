import { Model, Types } from 'mongoose';
import { SystemConfigExtended } from '../schemas/system-config-extended.schema';
import { FraudAlert } from '../schemas/fraud-alert.schema';
import { AuditLog } from '../schemas/audit-log.schema';
export declare class AdminGovernanceController {
    private configModel;
    private fraudAlertModel;
    private auditLogModel;
    private redisClient;
    constructor(configModel: Model<SystemConfigExtended>, fraudAlertModel: Model<FraudAlert>, auditLogModel: Model<AuditLog>);
    triggerEmergencyMaintenance(_admin: any, _payload: {
        forceMaintenanceState: boolean;
    }): Promise<void>;
    getFraudAlerts(): Promise<{
        data: (import("mongoose").Document<unknown, {}, FraudAlert, {}, {}> & FraudAlert & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
    }>;
    getAuditLogs(): Promise<{
        data: (import("mongoose").Document<unknown, {}, AuditLog, {}, {}> & AuditLog & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
    }>;
}
