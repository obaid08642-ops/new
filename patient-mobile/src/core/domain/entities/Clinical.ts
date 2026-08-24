import { BaseEntity } from './Users';
import { Money } from '../value-objects';

// ---------------------------------------------------------
// Clinical Models
// ---------------------------------------------------------

export interface Medication extends BaseEntity {
  name: string;
  scientificName: string;
  manufacturer: string;
  form: 'tablet' | 'syrup' | 'injection' | 'cream' | 'other';
  strength: string; // e.g. "500mg"
  requiresPrescription: boolean;
  price: Money;
  inStock: boolean;
}

export interface PrescriptionItem {
  medicationId: string;
  instructions: string; // e.g. "1 tablet every 8 hours"
  durationDays: number;
  quantity: number;
}

export interface Prescription extends BaseEntity {
  patientId: string;
  doctorId: string;
  items: PrescriptionItem[];
  issuedAt: Date;
  validUntil: Date;
  status: 'active' | 'fulfilled' | 'expired';
}

import { Appointment, AppointmentStatus, AppointmentMode } from '../../../types/contracts';
export type { Appointment };

export interface Consultation extends BaseEntity {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  notes: string;
  diagnosis?: string;
  prescriptionId?: string;
  followUpDate?: Date;
}
