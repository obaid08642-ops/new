// Shared Value Objects

export interface Address {
  id?: string;
  label: string; // e.g. "Home", "Work"
  street: string;
  city: string;
  state?: string;
  country: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface DateRange {
  startDate: Date;
  endDate?: Date;
}

export interface TimeSlot {
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "09:30"
  isAvailable: boolean;
}

export interface ContactInfo {
  phone: string;
  email?: string;
  website?: string;
}

export interface Rating {
  score: number;       // e.g., 4.5
  reviewCount: number;
}

export interface Currency {
  code: string; // ISO 4217, e.g. "SAR"
  symbol: string; // e.g. "SR"
}

export interface Tax {
  rate: number; // e.g. 0.15 for 15%
  isInclusive: boolean;
}

export interface Percentage {
  value: number; // 0 to 100
}

export interface Discount {
  type: 'percentage' | 'fixed';
  value: number; 
}
