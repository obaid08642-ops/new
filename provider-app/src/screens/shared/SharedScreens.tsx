// F51: split into ./shared/ — one file per screen. Re-exports keep existing imports working.
export { ChatSystem } from './shared/ChatSystem';
export { NotificationsCenter } from './shared/NotificationsCenter';
export { SupportCenter } from './shared/SupportCenter';
export { ReviewsSystem } from './shared/ReviewsSystem';
export { WithdrawalWorkflow } from './shared/WithdrawalWorkflow';
export { MedicalJobsScreen } from './shared/MedicalJobsScreen';
export { MedicalDrugIndexScreen } from './shared/MedicalDrugIndexScreen';
export { InsuranceConfigScreen } from './shared/InsuranceConfigScreen';
export { CertificatesConfigScreen } from './shared/CertificatesConfigScreen';
export { MediaConfigScreen } from './shared/MediaConfigScreen';
export { ProviderWalletScreen } from './shared/ProviderWalletScreen';
export { ProviderHomeStats } from './shared/ProviderHomeStats';
export { GlobalSystemSettings } from './shared/GlobalSystemSettings';
export * from './shared/_shared';
export * from './RegistrationSuccess';
