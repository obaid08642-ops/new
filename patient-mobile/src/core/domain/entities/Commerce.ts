import { BaseEntity } from './Users';
import { Money } from '../value-objects';

// ---------------------------------------------------------
// Commerce Models
// ---------------------------------------------------------

export interface OrderItem {
  productId: string; // e.g., medicationId
  quantity: number;
  unitPrice: Money;
}

export interface Order extends BaseEntity {
  patientId: string;
  providerId: string;
  items: OrderItem[];
  subtotal: Money;
  tax: Money;
  deliveryFee: Money;
  total: Money;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentId?: string;
  shippingAddressId?: string;
}

export interface Payment extends BaseEntity {
  orderId?: string;
  appointmentId?: string;
  userId: string;
  amount: Money;
  method: 'card' | 'wallet' | 'cash' | 'apple-pay' | 'stc-pay';
  status: 'pending' | 'success' | 'failed' | 'refunded';
  transactionReference?: string;
}

export interface Invoice extends BaseEntity {
  paymentId: string;
  userId: string;
  issuedAt: Date;
  pdfUrl?: string;
  totalAmount: Money;
}

export interface Coupon extends BaseEntity {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue?: Money;
  validUntil: Date;
  maxUsesPerUser: number;
  isActive: boolean;
}

// ---------------------------------------------------------
// Loyalty & Engagement
// ---------------------------------------------------------

export interface Wallet extends BaseEntity {
  userId: string;
  balance: Money;
  lastUpdated: Date;
}

export interface Loyalty extends BaseEntity {
  userId: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface Review extends BaseEntity {
  authorId: string;
  targetId: string; // providerId, productId, etc.
  rating: number; // 1-5
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ---------------------------------------------------------
// System Models
// ---------------------------------------------------------

export interface AppNotification extends BaseEntity {
  userId: string;
  title: string;
  body: string;
  type: 'alert' | 'message' | 'promo' | 'system';
  isRead: boolean;
  deepLink?: string;
}

export interface Attachment extends BaseEntity {
  uploaderId: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  purpose: 'avatar' | 'prescription' | 'lab-result' | 'identity' | 'other';
}
