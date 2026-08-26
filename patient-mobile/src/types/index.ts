// src/types/index.ts

// ==================== AUTH TYPES ====================
export interface User {
  id: string;
  phone: string;
  email?: string;
  name: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  bloodType?: BloodType;
  nationalId?: string;
  role: 'patient' | 'guest';
  isVerified: boolean;
  createdAt: string;
  healthProfile?: HealthProfile;
  subscription?: Subscription;
  loyaltyPoints: number;
  walletBalance: number;
}

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  error: string | null;
}

// ==================== HEALTH PROFILE ====================
export interface HealthProfile {
  height?: number;
  weight?: number;
  bmi?: number;
  bloodType?: BloodType;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: Medication[];
  emergencyContacts: EmergencyContact[];
  insurancePolicies: InsurancePolicy[];
  familyMembers: FamilyMember[];
}

export interface VitalSign {
  id: string;
  type: 'bloodPressure' | 'bloodGlucose' | 'heartRate' | 'temperature' | 'oxygen' | 'weight';
  value: number | { systolic: number; diastolic: number };
  unit: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  recordedAt: string;
  notes?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

// ==================== DOCTOR TYPES ====================
export interface Doctor {
  id: string;
  name: string;
  nameEn?: string;
  specialty: Specialty;
  specialtyEn?: string;
  avatar?: string;
  coverImage?: string;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  education: Education[];
  fellowships: string[];
  languages: string[];
  hospitals: Hospital[];
  services: DoctorService[];
  insuranceCompanies: string[];
  clinicPhotos: string[];
  bio?: string;
  isAvailableNow: boolean;
  nextAvailable?: string;
  isVerified: boolean;
  consultationCount: number;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

export interface DoctorService {
  type: 'online' | 'clinic' | 'home';
  price: number;
  duration: number;
  isAvailable: boolean;
  currency: string;
}

export interface Specialty {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
}

export interface Education {
  degree: string;
  university: string;
  year: number;
  country?: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isSelected?: boolean;
}

export interface DayAvailability {
  date: string;
  dayName: string;
  isAvailable: boolean;
  slots: TimeSlot[];
}

// ==================== APPOINTMENT TYPES ====================
export { Appointment, AppointmentStatus } from './contracts';

// ==================== PHARMACY TYPES ====================
export interface Medicine {
  id: string;
  nameAr: string;
  nameEn: string;
  brand: string;
  generic?: string;
  activeIngredient: string;
  concentration: string;
  form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'inhaler' | 'other';
  manufacturer: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image?: string;
  images: string[];
  category: string;
  requiresPrescription: boolean;
  isAvailable: boolean;
  stockCount?: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  description: string;
  indications: string[];
  dosage: string;
  sideEffects: string[];
  contraindications: string[];
  storage: string;
  barcode?: string;
  alternatives: Medicine[];
  interactions: string[];
}

export interface CartItem {
  medicine: Medicine;
  quantity: number;
  isCustom?: boolean;
  customImage?: string;
  customName?: string;
  prescriptionRequired?: boolean;
}

export interface PharmacyOrder {
  id: string;
  items: CartItem[];
  pharmacy?: Pharmacy;
  status: OrderStatus;
  deliveryType: 'delivery' | 'pickup';
  deliveryAddress?: Address;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  estimatedDelivery?: string;
  trackingInfo?: TrackingInfo;
  createdAt: string;
  isBroadcast?: boolean;
  broadcastOffers?: PharmacyOffer[];
}

export type OrderStatus =
  | 'pending'
  | 'broadcast_sent'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface Pharmacy {
  id: string;
  name: string;
  logo?: string;
  rating: number;
  reviewCount: number;
  distance?: number;
  deliveryTime?: number;
  isOpen: boolean;
  openUntil?: string;
  acceptsInsurance: boolean;
  hasDelivery: boolean;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  acceptedInsurances: string[];
}

export interface PharmacyOffer {
  pharmacy: Pharmacy;
  items: { medicineId: string; price: number; isAvailable: boolean }[];
  totalPrice: number;
  estimatedTime: number;
  isFullOrder: boolean;
}

export interface TrackingInfo {
  status: OrderStatus;
  steps: TrackingStep[];
  driver?: {
    name: string;
    phone: string;
    photo?: string;
    rating: number;
    latitude?: number;
    longitude?: number;
  };
  eta?: number;
  distance?: number;
}

export interface TrackingStep {
  title: string;
  description?: string;
  time?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

// ==================== DIAGNOSTICS TYPES ====================
export interface LabTest {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  price: number;
  duration: string;
  sampleType: 'blood' | 'urine' | 'stool' | 'swab' | 'other';
  preparationInstructions: PreparationInstruction[];
  description: string;
  whenToRequest: string[];
  isHomeCollection: boolean;
  normalRange?: string;
}

export interface PreparationInstruction {
  id: string;
  instruction: string;
  isRequired: boolean;
  icon?: string;
}

export interface TestPackage {
  id: string;
  nameAr: string;
  nameEn: string;
  tests: LabTest[];
  originalPrice: number;
  packagePrice: number;
  discount: number;
  image?: string;
  forCondition?: string;
}

export interface LabResult {
  id: string;
  test: LabTest;
  value: number | string;
  unit?: string;
  normalRange?: { min: number; max: number };
  status: 'normal' | 'high' | 'low' | 'critical';
  recordedAt: string;
  lab: Laboratory;
  reportPdf?: string;
}

export interface Laboratory {
  id: string;
  name: string;
  logo?: string;
  rating: number;
  reviewCount: number;
  distance?: number;
  hasHomeCollection: boolean;
  deliveryTime?: number;
  accreditations: string[];
  acceptedInsurances: string[];
  address: string;
  phone: string;
  latitude?: number;
  longitude?: number;
}

// ==================== NURSING TYPES ====================
export interface NursingService {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  icon: string;
  basePrice: number;
  priceUnit: 'per_visit' | 'per_hour' | 'per_day' | 'per_month';
  duration?: number;
  requiresSupplies: boolean;
  suppliesPrice?: number;
  suppliesList?: string[];
  requiredNurseLevel: 'nurse' | 'senior_nurse' | 'specialist';
  image?: string;
}

export interface NurseProfile {
  id: string;
  name: string;
  avatar?: string;
  licenseNumber: string;
  rating: number;
  reviewCount: number;
  completedServices: number;
  specializations: string[];
  languages: string[];
  latitude?: number;
  longitude?: number;
  eta?: number;
  isAvailable: boolean;
}

export interface NursingOrder {
  id: string;
  service: NursingService;
  nurse?: NurseProfile;
  status: OrderStatus;
  scheduleType: 'once' | 'recurring' | 'elderly_care';
  date?: string;
  time?: string;
  recurringDays?: number[];
  recurringTime?: string;
  recurringWeeks?: number;
  elderlyHours?: number;
  elderlyDays?: number;
  elderlyMonths?: number;
  address: Address;
  includeSupplies: boolean;
  specialInstructions?: string;
  price: number;
  paymentMethod: PaymentMethod;
  trackingInfo?: TrackingInfo;
  createdAt: string;
}

// ==================== INSURANCE TYPES ====================
export interface InsurancePolicy {
  id: string;
  company: InsuranceCompany;
  policyNumber: string;
  memberId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  coverage: InsuranceCoverage;
  beneficiaries: FamilyMember[];
  isDefault: boolean;
}

export interface InsuranceCompany {
  id: string;
  name: string;
  logo?: string;
  shortName: string;
  color?: string;
}

export interface InsuranceCoverage {
  consultations: number; // percentage
  medicines: number;
  diagnostics: number;
  nursing: number;
  annualLimit: number;
  usedAmount: number;
  deductible: number;
  deductibleUsed: number;
}

export interface InsuranceClaim {
  id: string;
  policy: InsurancePolicy;
  serviceType: string;
  amount: number;
  coveredAmount: number;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'reimbursed';
  submittedAt: string;
  documents: string[];
  notes?: string;
}

// ==================== PAYMENT TYPES ====================
export type PaymentMethod =
  | 'credit_card'
  | 'apple_pay'
  | 'google_pay'
  | 'stc_pay'
  | 'cash'
  | 'insurance'
  | 'wallet'
  | 'loyalty_points'
  | 'installment';

export interface PaymentCard {
  id: string;
  type: 'visa' | 'mastercard' | 'mada' | 'amex';
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
  isDefault: boolean;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit' | 'refund' | 'cashback';
  amount: number;
  description: string;
  service?: string;
  createdAt: string;
  reference?: string;
}

// ==================== COMMON TYPES ====================
export interface Address {
  id?: string;
  label?: string;
  city: string;
  district: string;
  street?: string;
  buildingNumber?: string;
  apartmentNumber?: string;
  landmark?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface Prescription {
  id: string;
  doctorName: string;
  date: string;
  medications: PrescribedMedicine[];
  notes?: string;
  image?: string;
  isOcrProcessed: boolean;
  ocrAccuracy?: number;
}

export interface PrescribedMedicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  price?: number;
  isAvailable?: boolean;
  requiresPrescription: boolean;
  notes?: string;
  alternatives?: Medicine[];
}

export interface Medication {
  id: string;
  medicine: Medicine | { name: string };
  dosage: string;
  frequency: string;
  times: string[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  remindersEnabled: boolean;
  reminderTimes: string[];
  adherenceRate?: number;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  bloodType?: BloodType;
  avatar?: string;
  phone?: string;
  healthProfile?: Partial<HealthProfile>;
  permissions: 'view' | 'full';
  hasApp: boolean;
  isLinked: boolean;
}

export type Subscription = {
  plan: 'basic' | 'plus' | 'family' | 'premium';
  startDate: string;
  endDate: string;
  isActive: boolean;
  autoRenew: boolean;
};

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  icon?: string;
  image?: string;
}

export type NotificationType =
  | 'appointment_reminder'
  | 'order_update'
  | 'lab_result'
  | 'medication_reminder'
  | 'health_alert'
  | 'loyalty_reward'
  | 'promotion'
  | 'system'
  | 'emergency'
  | 'family';

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  overallRating: number;
  waitTimeRating?: number;
  attentionRating?: number;
  cleanlinessRating?: number;
  accuracyRating?: number;
  comment?: string;
  images?: string[];
  isVerified: boolean;
  doctorReply?: string;
  createdAt: string;
  helpfulCount: number;
}

export interface LoyaltyActivity {
  id: string;
  type: 'earned' | 'redeemed';
  points: number;
  description: string;
  service?: string;
  createdAt: string;
}

export interface HealthChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  daysTotal: number;
  daysCompleted: number;
  reward: number;
  rewardBadge?: string;
  endDate: string;
  isCompleted: boolean;
  isJoined: boolean;
  participantsCount: number;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image?: string;
  author: {
    name: string;
    title: string;
    avatar?: string;
  };
  category: string;
  tags: string[];
  readTime: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  isBookmarked?: boolean;
}

export interface AISymptomResult {
  possibleConditions: {
    name: string;
    probability: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }[];
  recommendedSpecialty: Specialty;
  urgencyLevel: 'routine' | 'urgent' | 'emergency';
  reportDate: string;
  symptoms: string[];
  disclaimer: string;
}

// Navigation Types
export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  '(onboarding)': undefined;
};

export type AuthStackParamList = {
  welcome: undefined;
  login: undefined;
  register: undefined;
  otp: { phone: string; mode: 'register' | 'login' | 'guest' };
  'forgot-password': undefined;
  'reset-password': { token: string };
  'guest-checkout': { returnScreen: string };
};

export type HomeStackParamList = {
  index: undefined;
  search: { query?: string; type?: string };
  notifications: undefined;
};

export type ConsultationStackParamList = {
  index: undefined;
  'doctor-search': { specialty?: string; service?: string };
  'specialty-select': undefined;
  'doctor-profile': { doctorId: string };
  'booking-confirm': { doctorId: string; service: string; date: string; time: string };
  'booking-success': { appointmentId: string };
  'appointment-details': { appointmentId: string };
  'video-call': { appointmentId: string; token: string };
  'waiting-room': { appointmentId: string };
  'post-call-rating': { appointmentId: string };
  'cancel-appointment': { appointmentId: string };
  'reschedule-appointment': { appointmentId: string };
};

export type PharmacyStackParamList = {
  index: undefined;
  'product-detail': { medicineId: string };
  cart: undefined;
  'order-confirm': undefined;
  'order-tracking': { orderId: string };
  'prescription-upload': undefined;
  'ocr-results': { prescriptionId: string };
  'add-custom-item': undefined;
  'broadcast-status': { orderId: string };
  'order-history': undefined;
  wishlist: undefined;
};

export type ProfileStackParamList = {
  index: undefined;
  'edit-profile': undefined;
  'health-id': undefined;
  'vitals': undefined;
  'medications': undefined;
  'prescriptions': undefined;
  'reports': undefined;
  'family-hub': undefined;
  'add-family-member': undefined;
  'family-member-detail': { memberId: string };
  'family-calendar': undefined;
  'wearables': undefined;
  'chronic-disease': undefined;
  'diabetes-program': undefined;
  'maternity-hub': undefined;
  'pregnancy-tracker': { pregnancyId: string };
  'mental-health': undefined;
  'nutrition-hub': undefined;
  'loyalty': undefined;
  'wallet': undefined;
  'insurance': undefined;
  'add-insurance': undefined;
  'settings': undefined;
  'notifications-settings': undefined;
  'privacy-settings': undefined;
  'security-settings': undefined;
  'support': undefined;
  'live-chat': undefined;
  'complaints': undefined;
};
