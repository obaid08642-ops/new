import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class ExportService {
  constructor(@InjectConnection() private connection: Connection) {}

  async exportToCsv(modelName: string, fields: string[]): Promise<string> {
    const model = this.connection.model(modelName);
    if (!model) throw new NotFoundException(`Model ${modelName} not found`);

    const data = await model.find().lean();
    
    // Header row with UTF-8 BOM for Arabic character Excel compatibility
    let csv = '\uFEFF' + fields.join(',') + '\n';

    // Data rows
    for (const row of data as any[]) {
      const line = fields.map(field => {
        let val = row[field];
        if (val === undefined || val === null) return '';
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'object') val = JSON.stringify(val);
        
        // Escape quotes
        val = String(val).replace(/"/g, '""');
        // Wrap in quotes if comma or newline is present
        if (val.includes(',') || val.includes('\n') || val.includes('"')) {
          val = `"${val}"`;
        }
        return val;
      });
      csv += line.join(',') + '\n';
    }

    return csv;
  }

  async exportPatients(): Promise<string> {
    const fields = ['id', 'full_name', 'phone', 'email', 'role', 'active', 'preferred_lang', 'createdAt'];
    return this.exportToCsv('User', fields); // Patients are in users collection
  }

  async exportAppointments(): Promise<string> {
    const fields = ['id', 'mode', 'status', 'patient_id', 'doctor_id', 'scheduled_at', 'price', 'createdAt'];
    return this.exportToCsv('Appointment', fields);
  }

  async exportOrders(): Promise<string> {
    const fields = ['id', 'state', 'payment_status', 'amount_total', 'patient_id', 'pharmacy_id', 'createdAt'];
    return this.exportToCsv('Order', fields);
  }

  async exportTransactions(): Promise<string> {
    const fields = ['id', 'payment_provider', 'amount', 'status', 'patient_id', 'booking_id', 'createdAt'];
    return this.exportToCsv('Transaction', fields);
  }

  async exportAuditLogs(): Promise<string> {
    const fields = ['id', 'action', 'user_id', 'role', 'ip', 'user_agent', 'severity', 'createdAt'];
    return this.exportToCsv('AuditLog', fields);
  }
}
