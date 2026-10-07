import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Alert, AlertDocument } from './schemas/alert.schema';
import { MedicineRepository } from './repositories/medicine.repository';

export interface CreateAlertDto {
  medicine_id: string;
  medicine_name: string;
  type: 'back_in_stock' | 'price_drop';
  target_price?: number;
}

export interface AlertEligibility {
  alert_id: string;
  eligible: boolean;
  current_price?: number;
  in_stock: boolean;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @Inject('AlertModel') private readonly alertModel: Model<AlertDocument>,
    @Inject('MedicineRepository') private readonly meds: MedicineRepository,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  /**
   * Create a new back-in-stock or price-drop alert.
   */
  async create(patientId: string, dto: CreateAlertDto): Promise<AlertDocument> {
    const pid = String(patientId);
    const mid = String(dto.medicine_id);

    // Check if alert already exists for this patient+medicine+type
    const existing = await this.alertModel.findOne({
      patient_id: pid,
      medicine_id: mid,
      type: dto.type,
      status: 'active',
    }).lean().exec();

    if (existing) {
      throw new BadRequestException('alert_already_exists');
    }

    // Validate medicine exists
    const med = await this.meds.findOne({ id: { $eq: mid } }).lean().exec();
    if (!med) {
      throw new NotFoundException('medicine_not_found');
    }

    const alert = new this.alertModel({
      patient_id: pid,
      medicine_id: mid,
      medicine_name: dto.medicine_name,
      type: dto.type,
      target_price: dto.target_price,
      status: 'active',
    });

    await alert.save();
    this.logger.log(`Created ${dto.type} alert ${alert._id} for patient ${pid} on medicine ${mid}`);
    return alert;
  }

  /**
   * Get all alerts for a patient.
   */
  async listMine(patientId: string, status?: string): Promise<AlertDocument[]> {
    const query: any = { patient_id: String(patientId) };
    if (status) query.status = status;
    return this.alertModel.find(query).sort({ createdAt: -1 }).lean().exec() as unknown as Promise<AlertDocument[]>;
  }

  /**
   * Get a single alert by ID (patient ownership check).
   */
  async getById(alertId: string, patientId: string): Promise<AlertDocument> {
    const alert = await this.alertModel.findOne({ 
      _id: alertId, 
      patient_id: String(patientId) 
    }).lean().exec() as unknown as AlertDocument | null;
    if (!alert) throw new NotFoundException('alert_not_found');
    return alert;
  }

  /**
   * Cancel an alert.
   */
  async cancel(alertId: string, patientId: string): Promise<AlertDocument> {
    const alert = await this.alertModel.findOneAndUpdate(
      { _id: alertId, patient_id: String(patientId) },
      { status: 'cancelled' },
      { new: true }
    );
    if (!alert) throw new NotFoundException('alert_not_found');
    return alert;
  }

  /**
   * Check eligibility for an alert (current stock/price status).
   */
  async checkEligibility(alertId: string): Promise<AlertEligibility> {
    const alert = await this.alertModel.findById(alertId).lean().exec() as unknown as AlertDocument | null;
    if (!alert) throw new NotFoundException('alert_not_found');

    const med = await this.meds.findOne({ id: { $eq: alert.medicine_id } }).lean().exec() as any;
    if (!med) {
      return { alert_id: String(alert._id), eligible: false, in_stock: false };
    }

    const stock = Number(med.aggregate_stock ?? 0);
    const status = String(med.availability_status ?? '');
    const in_stock = stock > 0 && status !== 'out_of_stock' && status !== 'discontinued';
    const current_price = med.price ?? null;

    let eligible = false;
    if (alert.type === 'back_in_stock') {
      eligible = in_stock;
    } else if (alert.type === 'price_drop' && alert.target_price && current_price) {
      eligible = current_price <= alert.target_price;
    }

    return { alert_id: String(alert._id), eligible, current_price, in_stock };
  }

  /**
   * Process a single alert (send notification if triggered).
   */
  async processAlert(alertId: string): Promise<{ triggered: boolean }> {
    const alert = await this.alertModel.findById(alertId);
    if (!alert) throw new NotFoundException('alert_not_found');
    if (alert.status !== 'active') return { triggered: false };

    const eligibility = await this.checkEligibility(alertId);
    if (!eligibility.eligible) return { triggered: false };

    // Mark as triggered
    await this.alertModel.findByIdAndUpdate(alertId, {
      status: 'triggered',
      triggered_at: new Date(),
    });

    // TODO: Integrate with notification service to send alert
    this.logger.log(`Alert ${alertId} triggered for patient ${alert.patient_id}`);

    return { triggered: true };
  }

  /**
   * Cron job: Check all active alerts every hour.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAllAlerts(): Promise<void> {
    const activeAlerts = await this.alertModel.find({ status: 'active' }).limit(100).lean().exec() as unknown as AlertDocument[];

    if (activeAlerts.length === 0) return;

    this.logger.log(`Checking ${activeAlerts.length} active alerts`);

    for (const alert of activeAlerts) {
      try {
        await this.processAlert(String(alert._id));
      } catch (error) {
        this.logger.error(`Failed to process alert ${alert._id}: ${error.message}`);
      }
    }
  }
}
