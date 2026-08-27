import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OrderState, OrderRejectionReason } from '../common/enums';
import { v4 as uuid } from 'uuid';
import { InsuranceDetails, InsuranceDetailsSchema } from './insurance.schema';

@Schema({ _id: false })
export class OrderResult {
  @Prop() name: string;
  @Prop() result: string;
  @Prop() reference: string;
  @Prop({ default: false }) isAbnormal: boolean;
  @Prop() unit: string;
}
export const OrderResultSchema = SchemaFactory.createForClass(OrderResult);

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true }) medicine_id: string;
  @Prop({ required: true }) name_ar: string;
  @Prop() name_en?: string;
  @Prop({ default: 1 }) qty: number;
  @Prop({ default: 0 }) price: number;
  @Prop() image?: string;
  @Prop({ default: false }) is_manual_entry: boolean; // patient/doctor added unverified medicine
  @Prop({ default: false }) is_substitute: boolean;
  @Prop() substituted_from?: string;
  @Prop({ default: false }) unavailable: boolean; // pharmacy marked out
  @Prop({ type: Boolean }) isCovered?: boolean;
  @Prop() rejectReason?: string;
  @Prop() cashPrice?: number;
  @Prop({ default: false }) optInCash: boolean;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class StateTransition {
  @Prop({ default: '' }) from: string;
  @Prop({ required: true }) to: string;
  @Prop({ required: true }) by_user_id: string;
  @Prop() by_role?: string;
  @Prop() reason?: string;
  @Prop({ default: Date.now }) at: Date;
}
export const StateTransitionSchema = SchemaFactory.createForClass(StateTransition);

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() patient_name?: string;
  @Prop() patient_phone?: string;
  @Prop({ index: true }) pharmacy_id?: string; // assigned pharmacy
  @Prop() prescription_id?: string;
  @Prop({ type: [OrderItemSchema], default: [] }) items: OrderItem[];
  @Prop({ default: 0 }) subtotal: number;
  @Prop({ default: 0 }) delivery_fee: number;
  @Prop({ default: 0 }) total: number;
  @Prop({ type: String, enum: Object.values(OrderState), default: OrderState.NEW, index: true })
  state: OrderState;
  @Prop({ type: [StateTransitionSchema], default: [] }) state_history: StateTransition[];
  @Prop({
    type: [{ ts: Date, event: String, by: String }],
    default: []
  })
  timeline: { ts: Date; event: string; by: string }[];
  @Prop({ type: String, enum: ['PICKUP', 'DELIVERY'], default: 'DELIVERY' })
  delivery_mode: string;
  @Prop({ type: { lat: Number, lng: Number, address: String, district: String, city: String }, _id: false })
  delivery_address?: { lat?: number; lng?: number; address: string; district: string; city: string };
  @Prop() delivery_id?: string; // link to Delivery doc
  @Prop({ default: false }) escalated: boolean;
  @Prop({ type: String, enum: Object.values(OrderRejectionReason) }) rejection_reason?: OrderRejectionReason;
  @Prop() rejected_by?: string;
  @Prop() notes?: string;
  @Prop({ default: 'cash' }) payment_method: string;
  @Prop({ default: 'pending' }) payment_status: string;
  // ============ FINANCE (E1) — must be declared: strict schemas silently drop undeclared props ==========
  @Prop() coupon_code?: string;
  @Prop({ default: 0 }) coupon_discount?: number;
  @Prop({ default: 0 }) loyalty_points_used?: number;
  @Prop({ default: 0 }) loyalty_discount?: number;
  @Prop({ default: 0 }) price_before_discounts?: number;
  @Prop() refund_status?: string;
  @Prop() paid_at?: Date;
  @Prop() paid_via?: string;
  @Prop() refunded_at?: Date;
  @Prop({ default: 0 }) cancellation_fee?: number;
  @Prop() cancellation_fee_reason?: string;
  // ============ GEO DISPATCH ============
  @Prop({ type: Object, default: null }) dispatch?: {
    current_radius_km: number;
    attempts: { radius_km: number; candidates: { pharmacy_id: string; distance_km: number; available_count: number; total_requested: number; score: number; status: 'pending' | 'accepted' | 'rejected' | 'timeout' }[]; at: Date }[];
    selected_pharmacy_id?: string;
    selection_reason?: string;
    started_at: Date;
  };
  @Prop({ default: false }) is_split: boolean;
  @Prop() parent_order_id?: string;
  @Prop({ type: [String], default: [] }) sub_order_ids: string[];
  // ============ BASKET REVIEW (pre-payment) ============
  @Prop({ type: String, enum: ['none', 'pending_pharmacy_review', 'submitted_for_patient_approval', 'patient_approved', 'patient_rejected'], default: 'none', index: true })
  basket_review_status: string;
  @Prop({ type: [OrderItemSchema], default: [] }) pre_review_items: OrderItem[];
  @Prop({ default: 0 }) pre_review_total: number;
  @Prop() basket_submitted_at?: Date;
  @Prop() basket_decided_at?: Date;
  @Prop() pharmacy_basket_note?: string;
  @Prop() transaction_id?: string;
  // ============ INSURANCE (pharmacy pre-auth) ============
  @Prop({ type: String, enum: ['NONE', 'PENDING', 'APPROVED', 'PARTIAL', 'REJECTED'], default: 'NONE' }) insurance_status: string;
  @Prop() insurance_provider?: string;
  @Prop() insurance_member_id?: string;
  @Prop() insurance_card_image?: string;
  @Prop() insurance_reject_reason?: string;
  @Prop() insurance_decided_at?: Date;
  @Prop({ default: 0 }) insurance_copay?: number;
  @Prop({ type: InsuranceDetailsSchema }) insurance_details?: InsuranceDetails;
  // ============ MEDICAL RESULTS ============
  @Prop({ type: [OrderResultSchema], default: [] }) results: OrderResult[];
}
export type OrderDocument = Order & Document;
export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ patient_id: 1, createdAt: -1 });
OrderSchema.index({ pharmacy_id: 1, state: 1 });

@Schema({ timestamps: true, collection: 'pharmacy_bids' })
export class PharmacyBid extends Document {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) prescription_request_id: string; // references patient order or prescription request
  @Prop({ required: true, index: true }) pharmacy_id: string;
  @Prop({
    type: [{
      medicine_id: String,
      name_ar: String,
      price: Number,
      available: Boolean,
      alternative_name: String
    }],
    _id: false,
    default: []
  })
  items: Array<{ medicine_id?: string; name_ar: string; price: number; available: boolean; alternative_name?: string }>;
  @Prop({ required: true }) total_price: number;
  @Prop({ required: true }) expires_at: Date;
  @Prop({ type: String, enum: ['pending', 'accepted', 'rejected', 'expired'], default: 'pending' }) status: 'pending' | 'accepted' | 'rejected' | 'expired';
}
export const PharmacyBidSchema = SchemaFactory.createForClass(PharmacyBid);
