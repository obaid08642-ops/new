import { mongoDirectConnection } from './mongo-uri';

/** The options of the one application connection (used by AppModule, and by the reconnect test so the test exercises the real options). */
export function mongoConnectionOptions(env: NodeJS.ProcessEnv = process.env) {
  return {
    uri: env.MONGO_URL || 'mongodb://localhost:27017',
    dbName: env.DB_NAME || 'nabd_nestjs',
    directConnection: mongoDirectConnection(env.MONGO_URL),
    // ── High-concurrency connection pool (default Mongoose pool = 5, insufficient) ──
    maxPoolSize: parseInt(env.MONGO_MAX_POOL_SIZE || '200', 10),
    minPoolSize: parseInt(env.MONGO_MIN_POOL_SIZE || '20', 10),
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 45_000,
    heartbeatFrequencyMS: 10_000,
    connectTimeoutMS: 10_000,
  };
}
