"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const wallet_service_1 = require("./wallet.service");
const wallet_controller_1 = require("./wallet.controller");
const wallet_schema_1 = require("../../schemas/wallet.schema");
const user_schema_1 = require("../../schemas/user.schema");
const user_repository_1 = require("./repositories/user.repository");
const wallet_repository_1 = require("./repositories/wallet.repository");
const wallettransaction_repository_1 = require("./repositories/wallettransaction.repository");
const moyasar_module_1 = require("../moyasar/moyasar.module");
let WalletModule = class WalletModule {
};
exports.WalletModule = WalletModule;
exports.WalletModule = WalletModule = __decorate([
    (0, common_1.Module)({
        imports: [
            moyasar_module_1.MoyasarModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'Wallet', schema: wallet_schema_1.WalletSchema },
                { name: 'WalletTransaction', schema: wallet_schema_1.WalletTransactionSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
            ]),
        ],
        controllers: [wallet_controller_1.WalletController],
        providers: [wallet_service_1.WalletService, { provide: 'UserRepository', useClass: user_repository_1.UserRepository }, { provide: 'WalletRepository', useClass: wallet_repository_1.WalletRepository }, { provide: 'WalletTransactionRepository', useClass: wallettransaction_repository_1.WalletTransactionRepository }],
        exports: [wallet_service_1.WalletService],
    })
], WalletModule);
//# sourceMappingURL=wallet.module.js.map