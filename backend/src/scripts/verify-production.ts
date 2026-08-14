import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Logger } from '@nestjs/common';
import * as mongoose from 'mongoose';
import { RedisService } from '../modules/redis/redis.service';

async function verifyProduction() {
  const logger = new Logger('ProductionVerification');
  logger.log('Starting comprehensive production launch verification...');

  try {
    // 1. Verify Environment Variables
    const requiredEnvVars = ['MONGO_URI', 'REDIS_URL', 'JWT_SECRET', 'MOYASAR_API_KEY', 'GEMINI_API_KEY'];
    let envOk = true;
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        logger.error(`Missing required environment variable: ${envVar}`);
        envOk = false;
      }
    }
    if (!envOk) throw new Error('Environment variables check failed.');
    logger.log('✅ Environment variables OK.');

    const app = await NestFactory.createApplicationContext(AppModule);

    // 2. Verify MongoDB Connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB is not connected.');
    }
    logger.log('✅ MongoDB connection OK.');

    // 3. Verify Redis Connection
    const redisService = app.get(RedisService);
    const ping = await redisService.getClient().ping();
    if (ping !== 'PONG') {
      throw new Error('Redis ping failed.');
    }
    logger.log('✅ Redis connection OK.');

    logger.log('===================================================');
    logger.log('🚀 SYSTEM IS FULLY VERIFIED AND READY FOR PRODUCTION 🚀');
    logger.log('===================================================');

    await app.close();
    process.exit(0);
  } catch (error: any) {
    logger.error(`Production verification failed: ${error.message}`);
    process.exit(1);
  }
}

verifyProduction();
