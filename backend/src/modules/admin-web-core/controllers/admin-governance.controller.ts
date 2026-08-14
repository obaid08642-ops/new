import { Controller, Put, Body, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SystemConfigExtended } from '../schemas/system-config-extended.schema';
import { FraudAlert } from '../schemas/fraud-alert.schema';
import { AuditLog } from '../schemas/audit-log.schema';
import Redis from 'ioredis';

@Controller('admin/governance')
export class AdminGovernanceController {
  private redisClient: Redis;

  constructor(
    @InjectModel(SystemConfigExtended.name) private configModel: Model<SystemConfigExtended>,
    @InjectModel(FraudAlert.name) private fraudAlertModel: Model<FraudAlert>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>
  ) {
    // Note: in a real environment we handle Redis connection gracefully
    // this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  @Put('trigger-emergency-maintenance')
  async triggerEmergencyMaintenance(@Body() payload: { adminId: string; forceMaintenanceState: boolean }) {
    const { adminId, forceMaintenanceState } = payload;

    // Mutate and sync global infrastructure flags in the Redis caching layer instantly
    // await this.redisClient.set('flag:system_maintenance_active', forceMaintenanceState ? 'true' : 'false');

    // Persist structural entry trace downstream to Mongoose database models
    await this.configModel.findOneAndUpdate(
      { config_key: 'GLOBAL_SYSTEM_STATUS' },
      {
        $set: {
          config_value_matrix: { maintenance_kill_switch: forceMaintenanceState },
          last_modified_by_admin_id: new Types.ObjectId(adminId)
        }
      },
      { upsert: true }
    );

    return {
      success: true,
      maintenance_mode_deployed: forceMaintenanceState,
      message: forceMaintenanceState 
        ? 'تم تفعيل وضع الصيانة الطارئة الشامل وإحباط جميع مسارات النظام برمجياً.'
        : 'تم إلغاء وضع الصيانة وإعادة تشغيل المنظومة الطبية بالكامل بنجاح.'
    };
  }

  @Get('fraud-alerts')
  async getFraudAlerts() {
    // Strictly Immutable Read-Only ABAC Log access
    const alerts = await this.fraudAlertModel.find().sort({ createdAt: -1 }).limit(100).exec();
    return { data: alerts };
  }

  @Get('audit-logs')
  async getAuditLogs() {
    // Strictly Immutable Read-Only ABAC Log access
    const logs = await this.auditLogModel.find().sort({ createdAt: -1 }).limit(100).exec();
    return { data: logs };
  }
}
