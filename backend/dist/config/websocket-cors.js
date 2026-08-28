"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketCorsOptions = getWebSocketCorsOptions;
function getWebSocketCorsOptions() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const origins = process.env.ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
    const nonLocalEnvironment = !['development', 'test'].includes(nodeEnv);
    if (origins.includes('*') && nonLocalEnvironment) {
        throw new Error('FATAL: wildcard ALLOWED_ORIGINS is forbidden outside development/test');
    }
    if (origins.length)
        return { origin: origins, credentials: true };
    if (nonLocalEnvironment) {
        throw new Error('FATAL: ALLOWED_ORIGINS is required for WebSocket gateways outside development/test');
    }
    return { origin: true, credentials: true };
}
//# sourceMappingURL=websocket-cors.js.map