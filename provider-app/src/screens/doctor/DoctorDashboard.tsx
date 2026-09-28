// F51: split into ./doctor/ — one file per screen. Re-exports keep existing imports working.
export { DoctorDashboardNavigator } from './doctor/DoctorDashboardNavigator';
export { EPrescriptionScreen } from './doctor/EPrescriptionScreen';
export { SickLeaveScreen } from './doctor/SickLeaveScreen';
export { ReferralScreen } from './doctor/ReferralScreen';
export { RequestTestScreen } from './doctor/RequestTestScreen';
export { InsuranceClaimScreen } from './doctor/InsuranceClaimScreen';
export { MedicalReportScreen } from './doctor/MedicalReportScreen';
export { NotificationsScreen } from './doctor/NotificationsScreen';
export { AvailabilityPulseScreen } from './doctor/AvailabilityPulseScreen';
export { DoctorServiceManagementScreen } from './doctor/DoctorServiceManagementScreen';
export { StatisticsScreen } from './doctor/StatisticsScreen';
export { DoctorAvailabilityScreen } from './doctor/DoctorAvailabilityScreen';
export { DoctorLocationScreen } from './doctor/DoctorLocationScreen';
export { CertificatesConfigScreen } from './doctor/CertificatesConfigScreen';
export * from './doctor/_shared';
