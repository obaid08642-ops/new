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
    return super.createIOServer(port, { ...(options || {}), cors });
  }
}
