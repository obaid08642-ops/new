import { User, Patient, Provider } from '../../domain/entities';
import { Address, ContactInfo } from '../../domain/value-objects';

export interface UserPreferences {
  language: string;
  country: string;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'providers_only';
  shareDataWithResearch: boolean;
}

export class UserProfileService {
  // In a real application, this would rely on UserRepository
  // For Phase 1B, we build the interface and logic abstraction

  public async getProfile(userId: string): Promise<User | null> {
    // Fetch profile
    return null;
  }

  public async updatePreferences(userId: string, prefs: Partial<UserPreferences>): Promise<void> {
    // Update preferences in local and remote sources
  }

  public async updatePrivacy(userId: string, privacy: Partial<PrivacySettings>): Promise<void> {
    // Update privacy settings
  }

  public async addAddress(userId: string, address: Address): Promise<void> {
    // Add a new address to the user's profile
  }

  public async updateEmergencyContact(patientId: string, contact: ContactInfo): Promise<void> {
    // Update patient's emergency contact
  }

  public async getProviderProfile(providerId: string): Promise<Provider | null> {
    // Fetch detailed provider profile
    return null;
  }
}
