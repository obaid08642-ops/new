import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
export declare class ConfiguredIoAdapter extends IoAdapter {
    private readonly allowedOrigins;
    constructor(app: INestApplicationContext, allowedOrigins: true | string[]);
    createIOServer(port: number, options?: ServerOptions): any;
}
