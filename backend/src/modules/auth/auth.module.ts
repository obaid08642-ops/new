import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import type { StringValue } from 'ms';
import { PushModule } from '../push/push.module';
import { PresenceModule } from '../presence/presence.module';
import { MongooseModule } from '@nestjs/mongoose';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasskeyService } from './passkey.service';
import { PasskeyController } from './passkey.controller';
import { PasskeyCredential, PasskeyCredentialSchema } from './schemas/passkey-credential.schema';
import { TrustedDevice, TrustedDeviceSchema } from './schemas/trusted-device.schema';
import { DeviceTrustService } from './device-trust.service';
import { AdminDeviceService } from './admin-device.service';
import { AdminSessionService } from './admin-session.service';
import { AdminRecoveryService } from './admin-recovery.service';
import { AdminRecoveryController } from './admin-recovery.controller';
import { AdminDevicesController } from './admin-devices.controller';
import { StepUpController } from './step-up.controller';
import { StepUpService, StepUpGuard } from '../../common/step-up.guard';
import { User, UserSchema } from '../../schemas/user.schema';
import { PatientProfile, PatientProfileSchema } from '../../schemas/patient-profile.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { JwtAuthGuard } from '../../common/auth.guard';
import { PatientProfileRepository } from "./repositories/patientprofile.repository";
import { UserRepository } from "./repositories/user.repository";
import { PasswordSecurityService } from './password-security.service';
import { TurnstileService } from './turnstile.service';
import { SmsFraudProtectionService } from './sms-fraud-protection.service';
import { GuestService } from './guest.service';
import { PermissionMatrixService } from './permission-matrix.service';
import { AccountLinkingService } from './account-linking.service';
import { SessionService } from './session.service';
import { GuestLifecycleService } from './guest-lifecycle.service';
import { EmailOtpService } from './email-otp.service';
import { CheckoutContactService } from './checkout-contact.service';
import { MedicalAccessLog, MedicalAccessLogSchema } from '../../schemas/medical-access-log.schema';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('FATAL: JWT_SECRET must be configured');
        if (process.env.NODE_ENV === 'production' && secret.length < 32) throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production');
        return {
          secret,
          signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as StringValue },
        };
      },
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 0,
    }),
    PushModule,
    PresenceModule,
    FeatureFlagsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PatientProfile.name, schema: PatientProfileSchema },
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
      { name: PasskeyCredential.name, schema: PasskeyCredentialSchema },
      { name: TrustedDevice.name, schema: TrustedDeviceSchema },
      { name: MedicalAccessLog.name, schema: MedicalAccessLogSchema },
    ]),
  ],
  controllers: [AuthController, PasskeyController, AdminDevicesController, AdminRecoveryController, StepUpController],
  providers: [
    AuthService,
    PasskeyService,
    DeviceTrustService,
    AdminDeviceService,
    AdminSessionService,
    AdminRecoveryService,
    StepUpService,
    StepUpGuard,
    JwtAuthGuard,
    PasswordSecurityService,
    TurnstileService,
    SmsFraudProtectionService,
    GuestService,
    PermissionMatrixService,
    AccountLinkingService,
    SessionService,
    GuestLifecycleService,
    EmailOtpService,
    CheckoutContactService,
    { provide: 'PatientProfileRepository', useClass: PatientProfileRepository },
    { provide: 'UserRepository', useClass: UserRepository },
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard, MongooseModule, DeviceTrustService, AdminSessionService, PasswordSecurityService, TurnstileService, SmsFraudProtectionService, GuestService, PermissionMatrixService, AccountLinkingService, SessionService, GuestLifecycleService, EmailOtpService, CheckoutContactService],
})
export class AuthModule {}
