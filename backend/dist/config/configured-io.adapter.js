"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfiguredIoAdapter = void 0;
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
class ConfiguredIoAdapter extends platform_socket_io_1.IoAdapter {
    constructor(app, allowedOrigins) {
        super(app);
        this.allowedOrigins = allowedOrigins;
    }
    createIOServer(port, options) {
        const cors = this.allowedOrigins === true
            ? { origin: true, credentials: true }
            : { origin: this.allowedOrigins, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] };
        return super.createIOServer(port, { ...(options || {}), cors });
    }
}
exports.ConfiguredIoAdapter = ConfiguredIoAdapter;
//# sourceMappingURL=configured-io.adapter.js.map