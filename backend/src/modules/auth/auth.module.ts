import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
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
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'change-me',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PatientProfile.name, schema: PatientProfileSchema },
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, { provide: 'PatientProfileRepository', useClass: PatientProfileRepository }, { provide: 'UserRepository', useClass: UserRepository }],
  exports: [AuthService, JwtModule, JwtAuthGuard, MongooseModule],
})
export class AuthModule {}
