"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const push_module_1 = require("../push/push.module");
const mongoose_1 = require("@nestjs/mongoose");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const passkey_service_1 = require("./passkey.service");
const passkey_controller_1 = require("./passkey.controller");
const passkey_credential_schema_1 = require("./schemas/passkey-credential.schema");
const trusted_device_schema_1 = require("./schemas/trusted-device.schema");
const device_trust_service_1 = require("./device-trust.service");
const user_schema_1 = require("../../schemas/user.schema");
const patient_profile_schema_1 = require("../../schemas/patient-profile.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const auth_guard_1 = require("../../common/auth.guard");
const patientprofile_repository_1 = require("./repositories/patientprofile.repository");
const user_repository_1 = require("./repositories/user.repository");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.registerAsync({
                global: true,
                useFactory: () => {
                    const secret = process.env.JWT_SECRET;
                    if (!secret)
                        throw new Error('FATAL: JWT_SECRET must be configured');
                    if (process.env.NODE_ENV === 'production' && secret.length < 32)
                        throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production');
                    return {
                        secret,
                        signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '1h') },
                    };
                },
            }),
            push_module_1.PushModule,
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: patient_profile_schema_1.PatientProfile.name, schema: patient_profile_schema_1.PatientProfileSchema },
                { name: provider_profile_schema_1.ProviderProfile.name, schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: passkey_credential_schema_1.PasskeyCredential.name, schema: passkey_credential_schema_1.PasskeyCredentialSchema },
                { name: trusted_device_schema_1.TrustedDevice.name, schema: trusted_device_schema_1.TrustedDeviceSchema },
            ]),
        ],
        controllers: [auth_controller_1.AuthController, passkey_controller_1.PasskeyController],
        providers: [auth_service_1.AuthService, passkey_service_1.PasskeyService, device_trust_service_1.DeviceTrustService, auth_guard_1.JwtAuthGuard, { provide: 'PatientProfileRepository', useClass: patientprofile_repository_1.PatientProfileRepository }, { provide: 'UserRepository', useClass: user_repository_1.UserRepository }],
        exports: [auth_service_1.AuthService, jwt_1.JwtModule, auth_guard_1.JwtAuthGuard, mongoose_1.MongooseModule, device_trust_service_1.DeviceTrustService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map