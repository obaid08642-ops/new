/**
 * Phase 2A — Pharmacy Domain Schemas
 * ----------------------------------------------------------------
 * All new collections are namespaced under `pharmacy_*`. No breaking
 * changes to existing Phase 1B/1C schemas. The pre-existing
 * `provider_capabilities_pharmacy` collection (PharmacyInventoryItem)
 * remains the source of truth for stock per pharmacy.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { InsuranceDetails, InsuranceDetailsSchema } from '../../../schemas/insurance.schema';

// ============ ORDER STATES ============
export enum PharmacyOrderState {
  DRAFT = 'draft',
  INTAKE_PROCESSING = 'intake_processing',
  READY_FOR_SPLIT = 'ready_for_split',
  // Phase 2A-rework: broadcast-first flow
  BROADCASTING = 'broadcasting',                    // round in flight, awaiting "I Have All"
  AWAITING_FULL_ACCEPTANCE = 'awaiting_full_acceptance', // some partials in, still expanding
  // Governing-rules (PH-PHARMACY): offers accumulate for the PATIENT to compare & pick
  AWAITING_OFFER_SELECTION = 'awaiting_offer_selection', // responses collected, waiting for patient choice
  OFFER_SELECTED = 'offer_selected',                     // patient picked one pharmacy offer
  NEGOTIATING_SUBSTITUTES = 'negotiating_substitutes',   // chat phase for missing items
  ALLOCATING = 'allocating',
  PARTIALLY_ALLOCATED = 'partially_allocated',
  FULLY_ALLOCATED = 'fully_allocated',
  MANUAL_REVIEW = 'manual_review',
  CONFIRMED = 'confirmed',
  IN_FULFILLMENT = 'in_fulfillment',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PharmacyAllocationState {
  PENDING_REVIEW = 'pending_review',
  PARTIALLY_CONFIRMED = 'partially_confirmed',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum PrescriptionIntakeState {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  PARSED = 'parsed',
  FAILED = 'failed',
  MANUAL_REVIEW = 'manual_review',
  COMPLETED = 'completed',
}

export enum AllocationItemAction {
  AVAILABLE = 'available',
  SUBSTITUTE = 'substitute',
  UNAVAILABLE = 'unavailable',
}

// Item-level match status on the master order
export enum OrderItemMatchStatus {
  UNRESOLVED = 'unresolved',
  MATCHED = 'matched',
  MANUAL = 'manual',
}

// ============ STATE TRANSITION TABLES (enforced by services) ============
export const ORDER_TRANSITIONS: Record<PharmacyOrderState, PharmacyOrderState[]> = {
  [PharmacyOrderState.DRAFT]: [PharmacyOrderState.INTAKE_PROCESSING, PharmacyOrderState.READY_FOR_SPLIT, PharmacyOrderState.BROADCASTING, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.INTAKE_PROCESSING]: [PharmacyOrderState.READY_FOR_SPLIT, PharmacyOrderState.BROADCASTING, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.READY_FOR_SPLIT]: [PharmacyOrderState.BROADCASTING, PharmacyOrderState.ALLOCATING, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.BROADCASTING]: [PharmacyOrderState.AWAITING_FULL_ACCEPTANCE, PharmacyOrderState.AWAITING_OFFER_SELECTION, PharmacyOrderState.FULLY_ALLOCATED, PharmacyOrderState.ALLOCATING, PharmacyOrderState.NEGOTIATING_SUBSTITUTES, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.AWAITING_FULL_ACCEPTANCE]: [PharmacyOrderState.BROADCASTING, PharmacyOrderState.AWAITING_OFFER_SELECTION, PharmacyOrderState.FULLY_ALLOCATED, PharmacyOrderState.ALLOCATING, PharmacyOrderState.NEGOTIATING_SUBSTITUTES, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
  // PH-PHARMACY: patient compares collected offers then selects one pharmacy offer
  [PharmacyOrderState.AWAITING_OFFER_SELECTION]: [PharmacyOrderState.OFFER_SELECTED, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.OFFER_SELECTED]: [PharmacyOrderState.CONFIRMED, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.NEGOTIATING_SUBSTITUTES]: [PharmacyOrderState.ALLOCATING, PharmacyOrderState.PARTIALLY_ALLOCATED, PharmacyOrderState.FULLY_ALLOCATED, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.ALLOCATING]: [PharmacyOrderState.PARTIALLY_ALLOCATED, PharmacyOrderState.FULLY_ALLOCATED, PharmacyOrderState.NEGOTIATING_SUBSTITUTES, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.PARTIALLY_ALLOCATED]: [PharmacyOrderState.FULLY_ALLOCATED, PharmacyOrderState.NEGOTIATING_SUBSTITUTES, PharmacyOrderState.CONFIRMED, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.FULLY_ALLOCATED]: [PharmacyOrderState.CONFIRMED, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.MANUAL_REVIEW]: [PharmacyOrderState.READY_FOR_SPLIT, PharmacyOrderState.BROADCASTING, PharmacyOrderState.CANCELLED, PharmacyOrderState.CONFIRMED],
  [PharmacyOrderState.CONFIRMED]: [PharmacyOrderState.IN_FULFILLMENT, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.IN_FULFILLMENT]: [PharmacyOrderState.OUT_FOR_DELIVERY, PharmacyOrderState.DELIVERED, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.OUT_FOR_DELIVERY]: [PharmacyOrderState.DELIVERED, PharmacyOrderState.CANCELLED],
  [PharmacyOrderState.DELIVERED]: [PharmacyOrderState.COMPLETED],
  [PharmacyOrderState.COMPLETED]: [],
  [PharmacyOrderState.CANCELLED]: [],
};

export const ALLOCATION_TRANSITIONS: Record<PharmacyAllocationState, PharmacyAllocationState[]> = {
  [PharmacyAllocationState.PENDING_REVIEW]: [PharmacyAllocationState.PARTIALLY_CONFIRMED, PharmacyAllocationState.CONFIRMED, PharmacyAllocationState.REJECTED, PharmacyAllocationState.CANCELLED, PharmacyAllocationState.EXPIRED],
  [PharmacyAllocationState.PARTIALLY_CONFIRMED]: [PharmacyAllocationState.CONFIRMED, PharmacyAllocationState.REJECTED, PharmacyAllocationState.CANCELLED],
  [PharmacyAllocationState.CONFIRMED]: [PharmacyAllocationState.PREPARING, PharmacyAllocationState.CANCELLED],
  [PharmacyAllocationState.PREPARING]: [PharmacyAllocationState.READY_FOR_PICKUP, PharmacyAllocationState.CANCELLED],
  [PharmacyAllocationState.READY_FOR_PICKUP]: [PharmacyAllocationState.OUT_FOR_DELIVERY, PharmacyAllocationState.DELIVERED, PharmacyAllocationState.CANCELLED],
  [PharmacyAllocationState.OUT_FOR_DELIVERY]: [PharmacyAllocationState.DELIVERED, PharmacyAllocationState.CANCELLED],
  [PharmacyAllocationState.DELIVERED]: [],
  [PharmacyAllocationState.REJECTED]: [],
  [PharmacyAllocationState.CANCELLED]: [],
  [PharmacyAllocationState.EXPIRED]: [],
};

// ============ PHARMACY ORDER (master) ============
@Schema({ timestamps: true, collection: 'pharmacy_orders' })
export class PharmacyOrder extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) patient_account_id: string;
  @Prop({ required: true, default: PharmacyOrderState.DRAFT, enum: Object.values(PharmacyOrderState), index: true }) status: PharmacyOrderState;
  // PH-PHARMACY governing rule: offers accumulate for the patient to compare and
  // choose. 'PATIENT' (default) disables first-responder auto-lock in broadcast.
  @Prop({ default: 'PATIENT', enum: ['PATIENT', 'PHARMACY_RACE'] }) offer_selection_mode?: string;
  @Prop({ type: Object }) selected_offer?: {
    pharmacy_account_id: string;
    response_type: 'have_all' | 'partial';
    items: Array<{ order_item_id: string; have: 'yes' | 'no' | 'alternative'; qty_available?: number; unit_price?: number; alternative?: any }>;
    eta_minutes?: number;
    delivery_fee?: number;
    subtotal_estimate?: number;
    selected_at: Date;
  };
  @Prop() intake_id?: string;

  // PH-PHARMACY payment + insurance mirrors (P4): without these props mongoose
  // strict mode silently dropped every write from registerCod/evaluateInsurance.
  @Prop({ default: 'card', enum: ['card', 'cod', 'wallet', 'insurance'] }) payment_method?: string;
  @Prop({ default: 'pending' }) payment_status?: string; // pending | paid | cod_pending_collection | cod_collected
  @Prop() cod_collected_at?: Date;
  @Prop() cod_collected_by?: string;
  @Prop({ default: 'none' }) insurance_status?: string;  // none | APPROVED | PARTIAL_APPROVAL | REJECTED
  @Prop({ default: 0 }) copay?: number;
  @Prop({ type: Object }) insurance_evaluation?: {
    nphies_code?: string;
    policy_number?: string;
    member_id?: string;
    status?: string;
    copay_percent?: number;
    insurer_share?: number;
    patient_share?: number;
    items?: Array<{ item_id: string; decision: string; reject_reason?: string }>;
    decided_by?: string;
    decided_at?: Date;
  };

  // Items embedded as full objects (denormalized for atomic reads).
  @Prop({ type: [Object], default: [] }) items: Array<{
    id: string;
    raw_name: string;
    name_ar?: string;
    name_en?: string;
    generic_name?: string;
    dosage?: string;
    form?: string;
    frequency?: string;
    duration?: string;
    qty: number;
    match_status: OrderItemMatchStatus;
    matched_sku?: string;
    matched_inventory_id?: string;
    unit_price?: number;
    confidence?: number;
    substituted_from?: string;
    intake_source?: 'ocr' | 'voice' | 'text' | 'manual';
    notes?: string;
  }>;

  @Prop({ type: Object }) delivery_address?: {
    city?: string; district?: string; street?: string;
    geo?: { lat: number; lng: number }; notes?: string;
  };
  @Prop() patient_notes?: string;
  @Prop({ type: [Object], default: [] }) prescription_attachments?: Array<{
    type: 'image' | 'pdf' | 'voice' | 'text';
    uri?: string; base64?: string; intake_id?: string;
  }>;

  @Prop({ type: Object, default: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' } })
  totals: { subtotal: number; delivery_fee: number; total: number; currency: string };

  // Pricing breakdown
  @Prop({ default: 0 }) service_fee: number;
  @Prop({ default: 0 }) home_visit_fee: number;
  @Prop({ default: 0 }) transportation_fee: number;
  @Prop({ default: 0 }) total_price: number;

  @Prop({ type: InsuranceDetailsSchema }) insurance_details?: InsuranceDetails;

  /** Provider-submitted basket (Blueprint V1.2 flow) with quoted prices */
  @Prop({ type: [Object], default: [] }) pharmacy_basket?: Array<any>;
  // insurance_status/copay/insurance_evaluation mirrors live at lines ~135-137
  // (deduped: a parallel session re-declared them here and broke compilation)

  @Prop({ type: [String], default: [], index: true }) allocations: string[];
  @Prop({ default: 0 }) splits_count: number;
  @Prop({ default: 'single', enum: ['single', 'multi'] }) split_strategy: 'single' | 'multi';

  @Prop() scheduled_at?: Date;

  // EXPLAINABILITY: full snapshot of the split decision
  @Prop({ type: Object }) split_decision?: {
    ran_at: Date;
    total_candidates_considered: number;
    candidates_ranked: Array<{
      pharmacy_account_id: string;
      pharmacy_name?: string;
      distance_km?: number;
      coverage_full: number;
      coverage_partial: number;
      total_score: number;
      breakdown: Record<string, number>;
      included: boolean;
      reason_excluded?: string;
    }>;
    rounds: Array<{
      round: number;
      remaining_items_before: number;
      selected_pharmacy_account_id: string;
      items_assigned: string[];
      items_remaining_after: number;
    }>;
    final_uncovered_items: string[];
    splits_count: number;
    notes?: string;
  };

  @Prop({ type: [Object], default: [] }) timeline: Array<{ ts: Date; event: string; by?: string; meta?: any }>;
  @Prop() cancellation_reason?: string;
}
export const PharmacyOrderSchema = SchemaFactory.createForClass(PharmacyOrder);
PharmacyOrderSchema.index({ patient_account_id: 1, status: 1, createdAt: -1 });

// ============ PHARMACY ALLOCATION (per pharmacy sub-order) ============
@Schema({ timestamps: true, collection: 'pharmacy_allocations' })
export class PharmacyAllocation extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) order_id: string;
  @Prop({ required: true, index: true }) pharmacy_account_id: string;
  @Prop({ required: true, default: PharmacyAllocationState.PENDING_REVIEW, enum: Object.values(PharmacyAllocationState), index: true }) status: PharmacyAllocationState;

  // Item-level decisions taken by the pharmacist.
  @Prop({ type: [Object], default: [] }) items: Array<{
    id: string;
    order_item_id: string;
    action: AllocationItemAction;
    inventory_id?: string;
    sku?: string;
    name?: string;
    qty_requested: number;
    qty_offered: number;
    unit_price?: number;
    substitute_for_sku?: string;
    substitute_reason?: string;
    notes?: string;
    updated_at?: Date;
  }>;

  @Prop({ type: Object, default: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' } })
  totals: { subtotal: number; delivery_fee: number; total: number; currency: string };

  @Prop() distance_km?: number;

  // Dynamic SLA — based on item count / complexity
  @Prop() estimated_preparation_minutes?: number;
  @Prop() estimated_ready_at?: Date;

  // Pending review timeout (default 12 minutes per spec)
  @Prop() review_expires_at?: Date;

  @Prop({ type: Object }) delivery?: {
    method?: 'pharmacy_delivery' | 'pickup';
    courier_name?: string;
    courier_phone?: string;
    eta?: Date;
    delivered_at?: Date;
  };

  @Prop({ type: [Object], default: [] }) timeline: Array<{ ts: Date; event: string; by?: string; meta?: any }>;
  @Prop() notes_from_provider?: string;
  @Prop({ type: Object }) match_breakdown?: any; // snapshot from SmartSplit
  @Prop() cancellation_reason?: string;
  @Prop() rejection_reason?: string;
}
export const PharmacyAllocationSchema = SchemaFactory.createForClass(PharmacyAllocation);
PharmacyAllocationSchema.index({ pharmacy_account_id: 1, status: 1, createdAt: -1 });
PharmacyAllocationSchema.index({ order_id: 1, pharmacy_account_id: 1 });

// ============ PRESCRIPTION INTAKE (raw upload + parse result) ============
@Schema({ timestamps: true, collection: 'pharmacy_prescription_intakes' })
export class PrescriptionIntake extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) patient_account_id: string;
  @Prop({ required: true, enum: ['image', 'pdf', 'voice', 'text'] }) type: string;
  @Prop() source_uri?: string;
  @Prop() source_base64?: string;
  @Prop() raw_text?: string;
  @Prop() parser?: string;
  @Prop() parser_provider_used?: string;
  @Prop({ type: [String], default: [] }) parser_attempted: string[];
  @Prop({ required: true, default: PrescriptionIntakeState.QUEUED, enum: Object.values(PrescriptionIntakeState), index: true }) status: PrescriptionIntakeState;
  @Prop({ type: [Object], default: [] }) parsed_items: any[];
  @Prop({ type: [Object], default: [] }) unresolved_items: any[];
  @Prop({ default: 0 }) confidence: number;
  @Prop() error?: string;
  @Prop() processed_at?: Date;
}
export const PrescriptionIntakeSchema = SchemaFactory.createForClass(PrescriptionIntake);
PrescriptionIntakeSchema.index({ patient_account_id: 1, status: 1, createdAt: -1 });

// ============ SUBSTITUTE MAP (generic ↔ brand) ============
@Schema({ timestamps: true, collection: 'pharmacy_substitute_map' })
export class PharmacySubstituteMap extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) brand_sku: string;
  @Prop({ required: true, index: true }) generic_name: string;
  @Prop({ type: [Object], default: [] }) substitute_brands: Array<{ sku: string; name_ar?: string; name_en?: string }>;
  @Prop() dosage?: string;
  @Prop() form?: string;
  @Prop({ default: 'manual', enum: ['manual', 'imported'] }) source: string;
}
export const PharmacySubstituteMapSchema = SchemaFactory.createForClass(PharmacySubstituteMap);
PharmacySubstituteMapSchema.index({ generic_name: 1, dosage: 1 });

// ============ LOW STOCK ALERTS ============
@Schema({ timestamps: true, collection: 'pharmacy_low_stock_alerts' })
export class PharmacyLowStockAlert extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) pharmacy_account_id: string;
  @Prop({ required: true }) inventory_item_id: string;
  @Prop({ required: true }) sku: string;
  @Prop({ required: true }) name: string;
  @Prop({ default: 0 }) current_stock: number;
  @Prop({ default: 0 }) threshold: number;
  @Prop({ default: 'open', enum: ['open', 'acknowledged', 'restocked'], index: true }) status: string;
  @Prop() raised_at?: Date;
  @Prop() resolved_at?: Date;
}
export const PharmacyLowStockAlertSchema = SchemaFactory.createForClass(PharmacyLowStockAlert);
PharmacyLowStockAlertSchema.index({ pharmacy_account_id: 1, status: 1 });

// ============ EXPORT ALL ============
// ============ BROADCAST (Phase 2A-rework: broadcast-first workflow) ============
@Schema({ timestamps: true, collection: 'pharmacy_broadcasts' })
export class PharmacyBroadcast extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, unique: true, index: true }) order_id: string;
  @Prop({ required: true }) patient_account_id: string;
  @Prop({ default: 1 }) current_round: number;
  @Prop({ default: 3 }) current_radius_km: number;
  @Prop({ default: 7 }) max_radius_km: number;
  @Prop({ type: [Number], default: [3, 5, 7] }) round_radii_km: number[];
  // Atomic full-acceptance lock: first pharmacy to claim sets this.
  @Prop({ default: 'open', enum: ['open', 'locked', 'fallback_split', 'closed'], index: true }) lock_state: string;
  @Prop() locked_to_pharmacy_account_id?: string;
  @Prop() locked_at?: Date;
  // Per-pharmacy responses keyed by pharmacy_account_id
  @Prop({ type: [Object], default: [] }) responses: Array<{
    pharmacy_account_id: string;
    pharmacy_name?: string;
    distance_km?: number;
    response: 'have_all' | 'partial' | 'declined' | 'no_response';
    items: Array<{
      order_item_id: string;
      have: 'yes' | 'no' | 'alternative';
      qty_available?: number;
      unit_price?: number;
      alternative?: { sku?: string; name?: string; active_ingredient?: string; brand?: string; dosage?: string; form?: string; image_uri?: string; notes?: string };
    }>;
    eta_minutes?: number;
    delivery_fee?: number;
    responded_at: Date;
  }>;
  @Prop({ type: [String], default: [] }) notified_pharmacies: string[];
  @Prop({ type: [Object], default: [] }) timeline: Array<{ ts: Date; event: string; meta?: any }>;
}
export const PharmacyBroadcastSchema = SchemaFactory.createForClass(PharmacyBroadcast);
PharmacyBroadcastSchema.index({ lock_state: 1, current_round: 1 });

// ============ CHAT (substitute negotiation, restricted content) ============
@Schema({ timestamps: true, collection: 'pharmacy_chat_threads' })
export class PharmacyChatThread extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) order_id: string;
  @Prop({ required: true, index: true }) patient_account_id: string;
  @Prop({ required: true, index: true }) pharmacy_account_id: string;
  @Prop({ required: true }) order_item_id: string;
  @Prop({ default: 'open', enum: ['open', 'closed', 'archived'], index: true }) status: string;
  @Prop() last_message_at?: Date;
  @Prop() auto_close_at?: Date; // 12h after order completion
  @Prop() resolution?: 'accepted' | 'rejected' | 'removed' | 'cancelled' | 'timeout';
}
export const PharmacyChatThreadSchema = SchemaFactory.createForClass(PharmacyChatThread);
PharmacyChatThreadSchema.index({ order_id: 1, order_item_id: 1, pharmacy_account_id: 1 });

@Schema({ timestamps: true, collection: 'pharmacy_chat_messages' })
export class PharmacyChatMessage extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) thread_id: string;
  @Prop({ required: true }) sender_account_id: string;
  @Prop({ required: true, enum: ['patient', 'pharmacy', 'system'] }) sender_role: string;
  @Prop() text?: string;
  @Prop() image_uri?: string;
  @Prop({ type: Object }) substitute_offer?: { sku?: string; name?: string; active_ingredient?: string; brand?: string; dosage?: string; form?: string; image_uri?: string; price?: number; notes?: string };
  @Prop({ default: false }) blocked: boolean;
  @Prop() blocked_reason?: string;
}
export const PharmacyChatMessageSchema = SchemaFactory.createForClass(PharmacyChatMessage);
PharmacyChatMessageSchema.index({ thread_id: 1, createdAt: 1 });

// ============ DRUG SHORTAGE FLAGS ============
@Schema({ timestamps: true, collection: 'pharmacy_drug_shortage_flags' })
export class DrugShortageFlag extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ index: true }) sku?: string;
  @Prop({ index: true }) generic_name?: string;
  @Prop() name_ar?: string;
  @Prop() dosage?: string;
  @Prop() form?: string;
  @Prop({ required: true, enum: ['admin', 'pharmacy'] }) source: string;
  @Prop() reported_by_pharmacy_account_id?: string;
  @Prop({ default: 'pending', enum: ['pending', 'approved', 'rejected', 'resolved'], index: true }) status: string;
  @Prop() reason?: string;
  @Prop() approved_by?: string;
  @Prop() approved_at?: Date;
  @Prop() resolved_at?: Date;
}
export const DrugShortageFlagSchema = SchemaFactory.createForClass(DrugShortageFlag);

// ============ EXPORT ALL ============
export const PHARMACY_SCHEMAS = [
  { name: 'PharmacyOrder', schema: PharmacyOrderSchema },
  { name: 'PharmacyAllocation', schema: PharmacyAllocationSchema },
  { name: 'PrescriptionIntake', schema: PrescriptionIntakeSchema },
  { name: 'PharmacySubstituteMap', schema: PharmacySubstituteMapSchema },
  { name: 'PharmacyLowStockAlert', schema: PharmacyLowStockAlertSchema },
  { name: 'PharmacyBroadcast', schema: PharmacyBroadcastSchema },
  { name: 'PharmacyChatThread', schema: PharmacyChatThreadSchema },
  { name: 'PharmacyChatMessage', schema: PharmacyChatMessageSchema },
  { name: 'DrugShortageFlag', schema: DrugShortageFlagSchema },
];
