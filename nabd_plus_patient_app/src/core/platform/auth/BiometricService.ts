import * as LocalAuthentication from 'expo-local-authentication';
import { logger } from '../../../services/Logger';

export class BiometricService {
  private log = logger.scope('BiometricService');
  private lastEnrollmentLevel: LocalAuthentication.SecurityLevel = LocalAuthentication.SecurityLevel.NONE;

  /**
   * Check if hardware supports biometrics and is enrolled
   */
  public async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  /**
   * Prompt user to authenticate via FaceID/TouchID/Fingerprint
   */
  public async authenticate(promptMessage: string = 'Authenticate to continue'): Promise<boolean> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        this.log.warn('Biometrics not available or not enrolled');
        return false;
      }

      // Update enrollment level check
      const currentSecurityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      if (this.lastEnrollmentLevel !== LocalAuthentication.SecurityLevel.NONE && 
          currentSecurityLevel !== this.lastEnrollmentLevel) {
        this.log.warn('Biometric enrollment changed! Invalidating biometric trust.');
        return false;
      }
      this.lastEnrollmentLevel = currentSecurityLevel;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false, // Explicitly allow passcode fallback
      });

      if (result.success) {
        this.log.info('Biometric authentication successful');
        return true;
      } else {
        this.log.warn(`Biometric authentication failed or cancelled: ${result.error}`);
        return false;
      }
    } catch (error) {
      this.log.error('Error during biometric authentication', error);
      return false;
    }
  }

  /**
   * Prompts biometrics before allowing highly sensitive actions (e.g. medical records)
   */
  public async verifyForSensitiveAction(actionName: string): Promise<boolean> {
    this.log.info(`Requesting biometric verification for sensitive action: ${actionName}`);
    return this.authenticate(`Verify identity to ${actionName}`);
  }

  /**
   * Invalidate biometric trust (called on logout)
   */
  public invalidateBiometrics(): void {
    this.log.info('Invalidating biometric session');
    this.lastEnrollmentLevel = LocalAuthentication.SecurityLevel.NONE;
  }
}
