export interface FacilityBranch {
  id: string;
  facility_id: string;
  name_ar: string;
  name_en: string;
  location: string;
  status: 'active' | 'inactive';
}

export interface FacilityDepartment {
  id: string;
  branch_id: string;
  name_ar: string;
  name_en: string;
  icon: string;
  status: 'active' | 'inactive';
}

export interface FacilityResource {
  id: string;
  facility_id: string;
  branch_id: string;
  name_ar: string;
  name_en: string;
  type: 'mri' | 'ct' | 'or' | 'consultation' | 'ultrasound' | 'other';
  status: 'active' | 'maintenance' | 'inactive';
  capacity?: number;
}

export interface FacilityInvitation {
  id: string;
  facility_id: string;
  provider_phone_or_email: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  permissions: FacilityPermissions;
  created_at: string;
}

export interface FacilityPermissions {
  pricing: boolean;
  schedule: boolean;
  insurance: boolean;
  vacation: boolean;
  availability: boolean;
  online_consultation: boolean;
  home_visit: boolean;
  catalog: boolean;
  read_stats: boolean;
  manage_wallet: boolean;
}

export interface AuditLogEntry {
  id: string;
  facility_id: string;
  actor_id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface FacilityProfile {
  id: string;
  logo: string;
  cover: string;
  description_ar: string;
  description_en: string;
  specialties: string[];
  supported_insurance: string[];
  working_hours: string;
  contact_number: string;
  whatsapp: string;
}
