"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt = __importStar(require("bcryptjs"));
const uuid_1 = require("uuid");
async function main() {
    const { ADMIN_PHONE, ADMIN_EMAIL, ADMIN_PASSWORD, MONGO_URL, DB_NAME } = process.env;
    if (!ADMIN_PHONE || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
        console.error('Missing required env vars: ADMIN_PHONE, ADMIN_EMAIL, ADMIN_PASSWORD');
        process.exit(1);
    }
    if (ADMIN_PASSWORD.length < 12) {
        console.error('ADMIN_PASSWORD must be at least 12 characters');
        process.exit(1);
    }
    if (!MONGO_URL) {
        console.error('MONGO_URL is required');
        process.exit(1);
    }
    await mongoose_1.default.connect(MONGO_URL, { dbName: DB_NAME || 'nabd' });
    const users = mongoose_1.default.connection.collection('users');
    const existing = await users.findOne({ phone: ADMIN_PHONE });
    if (existing) {
        console.log(`Admin with phone ${ADMIN_PHONE} already exists — nothing to do.`);
        await mongoose_1.default.disconnect();
        return;
    }
    const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await users.insertOne({
        id: (0, uuid_1.v4)(),
        full_name: 'Nabdah Platform Admin',
        phone: ADMIN_PHONE,
        email: ADMIN_EMAIL.toLowerCase(),
        password_hash,
        role: 'admin',
        active: true,
        is_guest: false,
        preferred_lang: 'ar',
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    console.log(`Admin created for phone ${ADMIN_PHONE}. Change the password after first login.`);
    await mongoose_1.default.disconnect();
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=seed-admin.js.map