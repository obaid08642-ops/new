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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const common_1 = require("@nestjs/common");
const mongoose = __importStar(require("mongoose"));
const redis_service_1 = require("../modules/redis/redis.service");
async function verifyProduction() {
    const logger = new common_1.Logger('ProductionVerification');
    logger.log('Starting comprehensive production launch verification...');
    try {
        const requiredEnvVars = ['MONGO_URI', 'REDIS_URL', 'JWT_SECRET', 'MOYASAR_API_KEY', 'GEMINI_API_KEY'];
        let envOk = true;
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                logger.error(`Missing required environment variable: ${envVar}`);
                envOk = false;
            }
        }
        if (!envOk)
            throw new Error('Environment variables check failed.');
        logger.log(' Environment variables OK.');
        const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB is not connected.');
        }
        logger.log(' MongoDB connection OK.');
        const redisService = app.get(redis_service_1.RedisService);
        const ping = await redisService.getClient().ping();
        if (ping !== 'PONG') {
            throw new Error('Redis ping failed.');
        }
        logger.log(' Redis connection OK.');
        logger.log('===================================================');
        logger.log(' SYSTEM IS FULLY VERIFIED AND READY FOR PRODUCTION');
        logger.log('===================================================');
        await app.close();
        process.exit(0);
    }
    catch (error) {
        logger.error(`Production verification failed: ${error.message}`);
        process.exit(1);
    }
}
verifyProduction();
//# sourceMappingURL=verify-production.js.map