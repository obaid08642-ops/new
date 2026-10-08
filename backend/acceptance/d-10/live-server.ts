// MongoDB and a throw-away local Redis, so a test talks to the whole app over HTTP.
// Several instances can share one database, like the production cluster workers.
import { spawn, spawnSync, ChildProcess } from 'child_process';
import { createHash, randomBytes } from 'crypto';
import * as net from 'net';
import * as path from 'path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

const BACKEND = path.resolve(__dirname, '../..');
// Generated per run: a test server secret, never a fixed literal in the repo.
export const JWT_SECRET = randomBytes(24).toString('hex');
export const ADMIN_DEVICE = 'acceptance-admin-device-0001';

const freePort = () => new Promise<number>((resolve, reject) => {