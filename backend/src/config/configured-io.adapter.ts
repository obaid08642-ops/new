import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

/** Applies the centrally configured browser-origin policy to Socket.IO as well as HTTP. */
export class ConfiguredIoAdapter extends IoAdapter {
  constructor(app: INestApplicationContext, private readonly allowedOrigins: true | string[]) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const cors = this.allowedOrigins === true
      ? { origin: true, credentials: true }
      : { origin: this.allowedOrigins, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] };
    // socket.io's Server constructor accepts Partial<ServerOptions> and applies
    // its own defaults for omitted fields, but the adapter base class declares
    // the parameter as the full ServerOptions interface. Forward exactly what
    // we received plus the CORS policy and bridge the over-strict parameter
    // type with an explicit assertion instead of duplicating socket.io defaults.
    const merged: Partial<ServerOptions> = { ...(options || {}), cors };
    return super.createIOServer(port, merged as ServerOptions);
  }
}
