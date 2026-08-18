import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PushModule } from '../push/push.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasskeyService } from './passkey.service';
import { PasskeyController } from './passkey.controller';
import { PasskeyCredential, PasskeyCredentialSchema } from './schemas/passkey-credential.schema';
import { TrustedDevice, TrustedDeviceSchema } from './schemas/trusted-device.schema';
import { DeviceTrustService } from './device-trust.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { PatientProfile, PatientProfileSchema } from '../../schemas/patient-profile.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { JwtAuthGuard } from '../../common/auth.guard';
import { PatientProfileRepository } from "./repositories/patientprofile.repository";
import { UserRepository } from "./repositories/user.repository";

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
          signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
        };
      },
    }),
    PushModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PatientProfile.name, schema: PatientProfileSchema },
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
      { name: PasskeyCredential.name, schema: PasskeyCredentialSchema },
      { name: TrustedDevice.name, schema: TrustedDeviceSchema },
    ]),
  ],
  controllers: [AuthController, PasskeyController],
  providers: [AuthService, PasskeyService, DeviceTrustService, JwtAuthGuard, { provide: 'PatientProfileRepository', useClass: PatientProfileRepository }, { provide: 'UserRepository', useClass: UserRepository }],
  exports: [AuthService, JwtModule, JwtAuthGuard, MongooseModule, DeviceTrustService],
})
export class AuthModule {}
