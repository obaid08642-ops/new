"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
function validateEnvironment(env) {
    const nodeEnv = String(env.NODE_ENV || 'development');
    if (nodeEnv !== 'production')
        return env;
    const required = ['MONGO_URL', 'REDIS_URL', 'JWT_SECRET', 'ALLOWED_ORIGINS'];
    const missing = required.filter((name) => typeof env[name] !== 'string' || !String(env[name]).trim());
    if (missing.length)
        throw new Error(`FATAL: missing required production environment variables: ${missing.join(', ')}`);
    if (String(env.JWT_SECRET).length < 32)
        throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production');
    if (String(env.ALLOWED_ORIGINS).split(',').map((value) => value.trim()).includes('*')) {
        throw new Error('FATAL: ALLOWED_ORIGINS must not contain wildcard origin in production');
    }
    return env;
}
//# sourceMappingURL=env.validation.js.map