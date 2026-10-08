import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefillSubscription, RefillSubscriptionDocument } from './schemas/refill-subscription.schema';
import { ReorderEligibilityService, EligibilityLine } from './reorder-eligibility.service';
import { OrdersService } from './orders.service';
import { OrderRepository } from './repositories/order.repository';

export interface CreateSubscriptionDto {
  source_order_id: string;
  items: Array<{
    medicine_id: string;
    name: string;
    qty: number;
    requires_prescription: boolean;
    active_ingredient?: string;
    rx_validity_days?: number;
  }>;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval_days: number;
  delivery_address?: Record<string, any>;
  notes?: string;
  start_after_days?: number;
}

export interface SubscriptionEligibility {
  subscription_id: string;
  eligible: boolean;
  blocked_count: number;
  items: EligibilityLine[];
  next_refill_at: Date;
}

@Injectable()
export class RefillSubscriptionService {
  private readonly logger = new Logger(RefillSubscriptionService.name);

  constructor(
    @Inject('RefillSubscriptionModel') private readonly subModel: Model<RefillSubscriptionDocument>,
    @Inject('OrderRepository') private readonly orders: OrderRepository,
    @InjectConnection() private readonly conn: Connection,
    private readonly reorderEligibility: ReorderEligibilityService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Create a new auto-refill subscription from a source order.
   * Validates Rx eligibility and stock before creating.
   */
  async create(patientId: string, dto: CreateSubscriptionDto): Promise<RefillSubscriptionDocument> {
    const oid = String(dto.source_order_id);
    const pid = String(patientId);

    // Verify source order exists and belongs to patient
    const legacyQ = this.orders.findOne({ id: { $eq: oid }, patient_id: { $eq: pid } });
    const legacy = typeof (legacyQ as { lean?: unknown }).lean === 'function'
      ? await (legacyQ as { lean: () => Promise<Record<string, unknown> | null> }).lean()
      : ((await legacyQ) as Record<string, unknown> | null);

    if (!legacy) {
      const governed = await this.conn.collection('pharmacy_orders')
        .findOne({ id: { $eq: oid }, patient_account_id: { $eq: pid } } as never);
      if (!governed) throw new NotFoundException('source_order_not_found');
    }

    // Validate items against reorder eligibility
    const eligibility = await this.reorderEligibility.forOrder(oid, pid);
    const blocked = eligibility.items.filter(i => i.rx_status === 'expired' || i.rx_status === 'missing' || !i.in_stock);
    
    if (blocked.length > 0) {
      throw new BadRequestException({
        message: 'Some items cannot be auto-refilled',
        blocked_items: blocked.map(i => ({ medicine_id: i.medicine_id, reason: i.note })),
      });
    }

    const startAfter = dto.start_after_days ?? 0;
    const nextRefillAt = new Date(Date.now() + startAfter * 24 * 3600 * 1000);

    const subscription = new this.subModel({
      patient_id: pid,
      source_order_id: oid,
      items: dto.items.map(item => ({
        ...item,
        rx_validity_days: item.rx_validity_days ?? 90,
      })),
      frequency: dto.frequency,
      interval_days: dto.interval_days,
      next_refill_at: nextRefillAt,
      status: 'active',
      delivery_address: dto.delivery_address,
      notes: dto.notes,
      refill_count: 0,
    });

    await subscription.save();
    this.logger.log(`Created refill subscription ${subscription._id} for patient ${pid}`);
    return subscription;
  }

  /**
   * Get all subscriptions for a patient.
   */
  async listMine(patientId: string, status?: string): Promise<RefillSubscriptionDocument[]> {
    const query: any = { patient_id: String(patientId) };
    if (status) query.status = status;
    return this.subModel.find(query).sort({ createdAt: -1 }).lean().exec() as unknown as Promise<RefillSubscriptionDocument[]>;
  }

  /**
   * Get a single subscription by ID (patient ownership check).
   */
  async getById(subscriptionId: string, patientId: string): Promise<RefillSubscriptionDocument> {
    const sub = await this.subModel.findOne({ 
      _id: subscriptionId, 
      patient_id: String(patientId) 
    }).lean().exec() as unknown as RefillSubscriptionDocument | null;
    if (!sub) throw new NotFoundException('subscription_not_found');
    return sub;
  }

  /**
   * Pause a subscription.
   */
  async pause(subscriptionId: string, patientId: string): Promise<RefillSubscriptionDocument> {
    const sub = await this.subModel.findOneAndUpdate(
      { _id: subscriptionId, patient_id: String(patientId) },
      { status: 'paused' },
      { new: true }
    );
    if (!sub) throw new NotFoundException('subscription_not_found');
    return sub;
  }

  /**
   * Resume a paused subscription.
   */
  async resume(subscriptionId: string, patientId: string): Promise<RefillSubscriptionDocument> {
    const sub = await this.subModel.findOneAndUpdate(
      { _id: subscriptionId, patient_id: String(patientId) },
      { 
        status: 'active',
        next_refill_at: new Date(), // Resume immediately
      },
      { new: true }
    );
    if (!sub) throw new NotFoundException('subscription_not_found');
    return sub;
  }

  /**
   * Cancel a subscription.
   */
  async cancel(subscriptionId: string, patientId: string, reason?: string): Promise<RefillSubscriptionDocument> {
    const sub = await this.subModel.findOneAndUpdate(
      { _id: subscriptionId, patient_id: String(patientId) },
      { 
        status: 'cancelled',
        cancelled_at: new Date(),
        cancellation_reason: reason || 'patient_cancelled',
      },
      { new: true }
    );
    if (!sub) throw new NotFoundException('subscription_not_found');
    return sub;
  }

  /**
   * Check eligibility for a subscription's next refill.
   */
  async checkEligibility(subscriptionId: string): Promise<SubscriptionEligibility> {
    const sub = await this.subModel.findById(subscriptionId).lean().exec() as unknown as RefillSubscriptionDocument | null;
    if (!sub) throw new NotFoundException('subscription_not_found');

    const eligibility = await this.reorderEligibility.forOrder(sub.source_order_id, sub.patient_id);
    const blocked = eligibility.items.filter(i => i.rx_status === 'expired' || i.rx_status === 'missing' || !i.in_stock);
    
    return {
      subscription_id: String(sub._id),
      eligible: blocked.length === 0,
      blocked_count: blocked.length,
      items: eligibility.items,
      next_refill_at: sub.next_refill_at,
    };
  }

  /**
   * Process a single subscription's refill (create the order).
   */
  async processRefill(subscriptionId: string): Promise<{ order_id: string; items: any[] }> {
    const sub = await this.subModel.findById(subscriptionId);
    if (!sub) throw new NotFoundException('subscription_not_found');
    if (sub.status !== 'active') throw new BadRequestException('subscription_not_active');

    // Check eligibility before creating order
    const eligibility = await this.checkEligibility(subscriptionId);
    if (!eligibility.eligible) {
      // Mark subscription as expired if permanently blocked (Rx expired)
      const permanentlyBlocked = eligibility.items.some(i => i.rx_status === 'expired' || i.rx_status === 'missing');
      if (permanentlyBlocked) {
        await this.subModel.findByIdAndUpdate(subscriptionId, { status: 'expired' });
        this.logger.warn(`Subscription ${subscriptionId} expired due to Rx/eligibility issues`);
      }
      throw new BadRequestException({
        message: 'Refill blocked by eligibility',
        blocked_items: eligibility.items.filter(i => i.rx_status !== 'valid' || !i.in_stock),
      });
    }

    // Create the reorder using existing reorder logic
    const order = await this.ordersService.reorder(sub.source_order_id, { id: sub.patient_id } as any);
    
    // Update subscription
    await this.subModel.findByIdAndUpdate(subscriptionId, {
      $inc: { refill_count: 1 },
      last_refill_at: new Date(),
      next_refill_at: new Date(Date.now() + sub.interval_days * 24 * 3600 * 1000),
    });

    this.logger.log(`Processed refill for subscription ${subscriptionId}, created order ${order.id}`);
    return { order_id: order.id, items: order.items };
  }

  /**
   * Cron job: Process all due refills every hour.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processDueRefills(): Promise<void> {
    const now = new Date();
    const dueSubs = await this.subModel.find({
      status: 'active',
      next_refill_at: { $lte: now },
    }).limit(50).lean().exec() as unknown as RefillSubscriptionDocument[];

    if (dueSubs.length === 0) return;

    this.logger.log(`Processing ${dueSubs.length} due refill subscriptions`);

    for (const sub of dueSubs) {
      try {
        await this.processRefill(String(sub._id));
      } catch (error) {
        this.logger.error(`Failed to process refill for subscription ${sub._id}: ${error.message}`);
        // Don't block other subscriptions
      }
    }
  }

  /**
   * Send refill reminders (e.g., 3 days before next refill).
   * Runs daily at 9 AM.
   */
  @Cron('0 9 * * *')
  async sendRefillReminders(): Promise<void> {
    const reminderWindow = new Date(Date.now() + 3 * 24 * 3600 * 1000); // 3 days ahead
    const upcomingSubs = await this.subModel.find({
      status: 'active',
      next_refill_at: { $gte: new Date(), $lte: reminderWindow },
    }).lean().exec() as unknown as RefillSubscriptionDocument[];

    for (const sub of upcomingSubs) {
      // TODO: Integrate with notification service to send reminder
      this.logger.log(`Refill reminder due for subscription ${sub._id} (patient ${sub.patient_id})`);
    }
  }
}
