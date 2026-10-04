import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MedicalAccessLog, MedicalAccessLogSchema } from '../../schemas/medical-access-log.schema';

export interface MedicalAccessLogEntry {
  patientId: string;
  recordId: string;
  recordType: 'diagnosis' | 'report' | 'prescription' | 'insurance' | 'lab_result' | 'imaging' | 'consultation_note';
  accessedBy: string;
  accessorRole: 'patient' | 'provider' | 'admin' | 'system';
  action: 'view' | 'download' | 'print' | 'share' | 'export';
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

@Injectable()
export class MedicalAccessLogService {
  constructor(
    @InjectModel(MedicalAccessLog.name) private readonly logModel: Model<MedicalAccessLog>,
  ) {}

  async logAccess(entry: MedicalAccessLogEntry): Promise<MedicalAccessLog> {
    const log = new this.logModel({
      ...entry,
      accessedAt: new Date(),
    });
    return log.save();
  }

  async getPatientAccessLogs(
    patientId: string,
    options: { limit?: number; skip?: number; recordType?: string } = {},
  ): Promise<MedicalAccessLog[]> {
    const query: any = { patientId };
    if (options.recordType) query.recordType = options.recordType;
    
    return this.logModel
      .find(query)
      .sort({ accessedAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 100)
      .lean()
      .exec();
  }

  async getRecordAccessHistory(
    recordId: string,
    recordType: string,
  ): Promise<MedicalAccessLog[]> {
    return this.logModel
      .find({ recordId, recordType })
      .sort({ accessedAt: -1 })
      .lean()
      .exec();
  }

  async getProviderAccessLogs(
    providerId: string,
    options: { limit?: number; skip?: number } = {},
  ): Promise<MedicalAccessLog[]> {
    return this.logModel
      .find({ accessedBy: providerId, accessorRole: 'provider' })
      .sort({ accessedAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 100)
      .lean()
      .exec();
  }

  async getAccessStats(patientId: string): Promise<{
    totalAccesses: number;
    byType: Record<string, number>;
    byRole: Record<string, number>;
    recentActivity: MedicalAccessLog[];
  }> {
    const logs = await this.logModel.find({ patientId }).lean().exec();
    
    const byType: Record<string, number> = {};
    const byRole: Record<string, number> = {};
    
    logs.forEach(log => {
      byType[log.recordType] = (byType[log.recordType] || 0) + 1;
      byRole[log.accessorRole] = (byRole[log.accessorRole] || 0) + 1;
    });
    
    return {
      totalAccesses: logs.length,
      byType,
      byRole,
      recentActivity: logs.slice(0, 10),
    };
  }
}

export const MedicalAccessLogModule = {
  name: MedicalAccessLog.name,
  schema: MedicalAccessLogSchema,
};
