"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
exports.redisUrlFromEnv = redisUrlFromEnv;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
function redisUrlFromEnv() {
    if (process.env.REDIS_URL)
        return process.env.REDIS_URL;
    const host = process.env.REDIS_HOST || 'localhost';
    const port = process.env.REDIS_PORT || '6379';
    const password = process.env.REDIS_PASSWORD;
    return password ? `redis://:${password}@${host}:${port}` : `redis://${host}:${port}`;
}
let RedisService = class RedisService {
    constructor() {
        this.logger = new common_1.Logger('RedisService');
        this.ready = false;
        this.warned = false;
        this.memKv = new Map();
        this.memHash = new Map();
        this.memSets = new Map();
        this.memZset = new Map();
    }
    onModuleInit() {
        const redisUrl = redisUrlFromEnv();
        const options = {
            retryStrategy: (times) => Math.min(times * 100, 3000),
            maxRetriesPerRequest: 3,
            enableOfflineQueue: false,
            lazyConnect: false,
        };
        this.client = new ioredis_1.default(redisUrl, options);
        this.subscriber = new ioredis_1.default(redisUrl, options);
        this.publisher = new ioredis_1.default(redisUrl, options);
        const markReady = () => { this.ready = true; this.logger.log('Redis connected'); };
        const markDown = () => { this.ready = false; this.fallbackWarn(); };
        for (const c of [this.client, this.subscriber, this.publisher]) {
            c.on('ready', markReady);
            c.on('error', () => markDown());
            c.on('end', () => { this.ready = false; });
        }
        this.sweeper = setInterval(() => this.sweep(), 30000);
        this.sweeper.unref();
    }
    async onModuleDestroy() {
        clearInterval(this.sweeper);
        await this.client?.quit().catch(() => undefined);
        await this.subscriber?.quit().catch(() => undefined);
        await this.publisher?.quit().catch(() => undefined);
    }
    fallbackWarn() {
        if (!this.warned) {
            this.warned = true;
            this.logger.warn('Redis unavailable — using in-memory fallback store (per-process, not shared across replicas)');
        }
    }
    alive(e) {
        if (!e)
            return false;
        if (e.exp && e.exp <= Date.now())
            return false;
        return true;
    }
    memGet(key) {
        const e = this.memKv.get(key);
        if (!this.alive(e)) {
            this.memKv.delete(key);
            return null;
        }
        return e.v;
    }
    memSet(key, v, ttlSeconds) {
        this.memKv.set(key, { v, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined });
    }
    sweep() {
        const now = Date.now();
        for (const [k, e] of this.memKv)
            if (e.exp && e.exp <= now)
                this.memKv.delete(k);
        for (const [k, e] of this.memHash)
            if (e.exp && e.exp <= now)
                this.memHash.delete(k);
        for (const [k, e] of this.memSets)
            if (e.exp && e.exp <= now)
                this.memSets.delete(k);
        for (const [k, e] of this.memZset)
            if (e.exp && e.exp <= now)
                this.memZset.delete(k);
    }
    async get(key) {
        if (this.ready) {
            try {
                return await this.client.get(key);
            }
            catch { }
        }
        return this.memGet(key);
    }
    async set(key, value, ttlSeconds) {
        if (this.ready) {
            try {
                if (ttlSeconds)
                    await this.client.setex(key, ttlSeconds, value);
                else
                    await this.client.set(key, value);
                return;
            }
            catch { }
        }
        this.memSet(key, value, ttlSeconds);
    }
    async del(key) {
        if (this.ready) {
            try {
                await this.client.del(key);
                return;
            }
            catch { }
        }
        this.memKv.delete(key);
        this.memHash.delete(key);
        this.memSets.delete(key);
        this.memZset.delete(key);
    }
    async ttl(key) {
        if (this.ready) {
            try {
                return await this.client.ttl(key);
            }
            catch { }
        }
        const e = this.memKv.get(key);
        if (!this.alive(e))
            return -2;
        return e.exp ? Math.max(0, Math.round((e.exp - Date.now()) / 1000)) : -1;
    }
    async exists(key) {
        if (this.ready) {
            try {
                return (await this.client.exists(key)) > 0;
            }
            catch { }
        }
        return this.memGet(key) !== null;
    }
    async incr(key) {
        if (this.ready) {
            try {
                return await this.client.incr(key);
            }
            catch { }
        }
        const cur = this.memGet(key);
        const next = (parseInt(cur || '0', 10) || 0) + 1;
        const e = this.memKv.get(key);
        this.memKv.set(key, { v: String(next), exp: e?.exp });
        return next;
    }
    async expire(key, ttl) {
        if (this.ready) {
            try {
                await this.client.expire(key, ttl);
                return;
            }
            catch { }
        }
        const e = this.memKv.get(key);
        if (this.alive(e))
            e.exp = Date.now() + ttl * 1000;
    }
    async setnx(key, value) {
        if (this.ready) {
            try {
                return (await this.client.setnx(key, value)) === 1;
            }
            catch { }
        }
        if (this.memGet(key) !== null)
            return false;
        this.memSet(key, value);
        return true;
    }
    async keys(pattern) {
        if (this.ready) {
            try {
                return await this.client.keys(pattern);
            }
            catch { }
        }
        const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
        const out = [];
        for (const k of this.memKv.keys())
            if (this.memGet(k) !== null && re.test(k))
                out.push(k);
        return out;
    }
    async mget(keys) {
        if (this.ready) {
            try {
                return await this.client.mget(...keys);
            }
            catch { }
        }
        return keys.map((k) => this.memGet(k));
    }
    memHashOf(key) {
        const h = this.memHash.get(key);
        if (!this.alive(h)) {
            this.memHash.delete(key);
            return null;
        }
        return h;
    }
    async hset(key, field, value) {
        if (this.ready) {
            try {
                await this.client.hset(key, field, value);
                return;
            }
            catch { }
        }
        let h = this.memHashOf(key);
        if (!h) {
            h = new Map();
            this.memHash.set(key, h);
        }
        h.set(field, value);
    }
    async hget(key, field) {
        if (this.ready) {
            try {
                return await this.client.hget(key, field);
            }
            catch { }
        }
        return this.memHashOf(key)?.get(field) ?? null;
    }
    async hgetall(key) {
        if (this.ready) {
            try {
                return await this.client.hgetall(key);
            }
            catch { }
        }
        const h = this.memHashOf(key);
        return h ? Object.fromEntries(h.entries()) : {};
    }
    async hdel(key, field) {
        if (this.ready) {
            try {
                await this.client.hdel(key, field);
                return;
            }
            catch { }
        }
        this.memHashOf(key)?.delete(field);
    }
    async hmset(key, data) {
        if (this.ready) {
            try {
                await this.client.hmset(key, data);
                return;
            }
            catch { }
        }
        let h = this.memHashOf(key);
        if (!h) {
            h = new Map();
            this.memHash.set(key, h);
        }
        for (const [f, v] of Object.entries(data))
            h.set(f, v);
    }
    memSetOf(key) {
        const s = this.memSets.get(key);
        if (!this.alive(s)) {
            this.memSets.delete(key);
            return null;
        }
        return s;
    }
    async sadd(key, ...members) {
        if (this.ready) {
            try {
                await this.client.sadd(key, ...members);
                return;
            }
            catch { }
        }
        let s = this.memSetOf(key);
        if (!s) {
            s = new Set();
            this.memSets.set(key, s);
        }
        for (const m of members)
            s.add(m);
    }
    async srem(key, ...members) {
        if (this.ready) {
            try {
                await this.client.srem(key, ...members);
                return;
            }
            catch { }
        }
        const s = this.memSetOf(key);
        if (s)
            for (const m of members)
                s.delete(m);
    }
    async smembers(key) {
        if (this.ready) {
            try {
                return await this.client.smembers(key);
            }
            catch { }
        }
        const s = this.memSetOf(key);
        return s ? Array.from(s) : [];
    }
    async sismember(key, member) {
        if (this.ready) {
            try {
                return (await this.client.sismember(key, member)) === 1;
            }
            catch { }
        }
        return this.memSetOf(key)?.has(member) ?? false;
    }
    memZsetOf(key) {
        const z = this.memZset.get(key);
        if (!this.alive(z)) {
            this.memZset.delete(key);
            return null;
        }
        return z;
    }
    async zadd(key, score, member) {
        if (this.ready) {
            try {
                await this.client.zadd(key, score, member);
                return;
            }
            catch { }
        }
        let z = this.memZsetOf(key);
        if (!z) {
            z = { items: [] };
            this.memZset.set(key, z);
        }
        z.items = z.items.filter((i) => i.member !== member);
        z.items.push({ score, member });
    }
    async zrem(key, member) {
        if (this.ready) {
            try {
                await this.client.zrem(key, member);
                return;
            }
            catch { }
        }
        const z = this.memZsetOf(key);
        if (z)
            z.items = z.items.filter((i) => i.member !== member);
    }
    async zrange(key, start, stop) {
        if (this.ready) {
            try {
                return await this.client.zrange(key, start, stop);
            }
            catch { }
        }
        const z = this.memZsetOf(key);
        if (!z)
            return [];
        const sorted = [...z.items].sort((a, b) => a.score - b.score).map((i) => i.member);
        const end = stop === -1 ? undefined : stop + 1;
        return sorted.slice(start, end);
    }
    async zrangebyscore(key, min, max) {
        if (this.ready) {
            try {
                return await this.client.zrangebyscore(key, min, max);
            }
            catch { }
        }
        const z = this.memZsetOf(key);
        if (!z)
            return [];
        return z.items.filter((i) => i.score >= min && i.score <= max).sort((a, b) => a.score - b.score).map((i) => i.member);
    }
    async publish(channel, message) {
        if (this.ready) {
            try {
                await this.publisher.publish(channel, message);
            }
            catch { }
        }
    }
    async subscribe(channel, handler) {
        if (!this.ready)
            return;
        try {
            await this.subscriber.subscribe(channel);
            this.subscriber.on('message', (ch, msg) => { if (ch === channel)
                handler(msg); });
        }
        catch { }
    }
    async unsubscribe(channel) {
        if (!this.ready)
            return;
        try {
            await this.subscriber.unsubscribe(channel);
        }
        catch { }
    }
    async getJson(key) {
        const v = await this.get(key);
        return v ? JSON.parse(v) : null;
    }
    async setJson(key, value, ttlSeconds) {
        await this.set(key, JSON.stringify(value), ttlSeconds);
    }
    async checkRateLimit(key, limit, windowSeconds) {
        const current = await this.incr(`ratelimit:${key}`);
        if (current === 1)
            await this.expire(`ratelimit:${key}`, windowSeconds);
        return { allowed: current <= limit, remaining: Math.max(0, limit - current) };
    }
    getClient() {
        if (this.ready)
            return this.client;
        const self = this;
        return {
            status: 'fallback',
            async ping() { return 'PONG'; },
            async get(key) { return self.get(key); },
            async set(key, value, ...args) {
                let ttl;
                let nx = false;
                for (let i = 0; i < args.length; i++) {
                    const a = String(args[i]).toUpperCase();
                    if (a === 'EX' && typeof args[i + 1] !== 'undefined') {
                        ttl = Number(args[i + 1]);
                        i++;
                    }
                    if (a === 'NX')
                        nx = true;
                }
                if (nx && self.memGet(key) !== null)
                    return null;
                self.memSet(key, value, ttl);
                return 'OK';
            },
            async del(key) { return self.del(key); },
            async exists(key) { return (await self.exists(key)) ? 1 : 0; },
            async ttl(key) { return self.ttl(key); },
            async incr(key) { return self.incr(key); },
            async expire(key, ttl) { return self.expire(key, ttl); },
            async setnx(key, value) { return (await self.setnx(key, value)) ? 1 : 0; },
            async sadd(key, ...members) {
                const cur = self.memGet(key);
                const arr = cur ? JSON.parse(cur) : [];
                let added = 0;
                for (const m of members)
                    if (!arr.includes(m)) {
                        arr.push(m);
                        added++;
                    }
                self.memSet(key, JSON.stringify(arr));
                return added;
            },
            async smembers(key) {
                const cur = self.memGet(key);
                return cur ? JSON.parse(cur) : [];
            },
            async srem(key, ...members) {
                const cur = self.memGet(key);
                const arr = cur ? JSON.parse(cur) : [];
                const next = arr.filter((m) => !members.includes(m));
                self.memSet(key, JSON.stringify(next));
                return arr.length - next.length;
            },
            async lpush(key, ...values) {
                const cur = self.memGet(key);
                const arr = cur ? JSON.parse(cur) : [];
                arr.unshift(...values);
                self.memSet(key, JSON.stringify(arr));
                return arr.length;
            },
        };
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)()
], RedisService);
//# sourceMappingURL=redis.service.js.map