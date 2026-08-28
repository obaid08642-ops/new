import { Address, Money, Rating, ContactInfo } from '../value-objects';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------
// Core Users
// ---------------------------------------------------------

export type UserRole = 'guest' | 'patient' | 'doctor' | 'pharmacy' | 'nurse' | 'lab' | 'admin' | 'insurance';

export interface User extends BaseEntity {
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  language: string;
  isActive: boolean;
}

export interface Patient extends BaseEntity {
  userId: string;
  dateOfBirth?: Date;
  gender?: 'M' | 'F' | 'O';
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContact?: ContactInfo;
}

export interface Provider extends BaseEntity {
  userId: string;
  businessName: string;
  licenseNumber: string;
  specialization?: string[];
  isVerified: boolean;
  rating?: Rating;
}

// ---------------------------------------------------------
// Medical Providers
// ---------------------------------------------------------

export interface Doctor extends Provider {
  medicalDegree: string;
  yearsOfExperience: number;
  consultationFee: Money;
  clinicAddress?: Address;
}

export interface Pharmacy extends Provider {
  operatingHours: string;
  deliveryAvailable: boolean;
  deliveryFee?: Money;
  address: Address;
}

export interface Nurse extends Provider {
  certificationId: string;
  hourlyRate: Money;
  availableForHomeVisits: boolean;
}

export interface Laboratory extends Provider {
  accreditationDetails: string;
  testCatalogIds: string[];
  homeSampleCollection: boolean;
  address: Address;
}

export interface Clinic extends Provider {
  facilities: string[];
  numberOfDoctors: number;
  address: Address;
}

export interface Insurance extends Provider {
  policyTypes: string[];
  coverageNetworks: string[];
}
