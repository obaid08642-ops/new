import { Schema, Document } from 'mongoose';
import { ProcurementStatus } from '../enums/procurement-status.enum';

export interface Quotation extends Document {
  procurementRequestId: string;
  adminId: string;
  items: Array<{ medicineId: string; quantity: number; price: number }>;
  totalPrice: number;
  status: ProcurementStatus;
  adminNotes?: string;
  pharmacyFeedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const QuotationSchema = new Schema<Quotation>(
  {
    procurementRequestId: { type: String, required: true, ref: 'ProcurementRequest' },
    adminId: { type: String, required: true },
    items: [
      {
        medicineId: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(ProcurementStatus),
      default: ProcurementStatus.QUOTATION_ISSUED,
    },
    adminNotes: { type: String },
    pharmacyFeedback: { type: String },
  },
  { timestamps: true },
);
