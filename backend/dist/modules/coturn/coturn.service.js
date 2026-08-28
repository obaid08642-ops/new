"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoturnService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
let CoturnService = class CoturnService {
    constructor() {
        this.logger = new common_1.Logger('CoturnService');
        this.coturnHost = process.env.COTURN_HOST || 'turn.example.com';
        this.coturnSecret = process.env.COTURN_SECRET || 'change_this_secret';
        this.stunPort = parseInt(process.env.COTURN_STUN_PORT || '3478', 10);
        this.turnPort = parseInt(process.env.COTURN_TURN_PORT || '3478', 10);
        this.turnRealm = process.env.TURN_REALM || process.env.COTURN_REALM || 'nabdahplus';
        this.customUrls = process.env.TURN_URLS
            ? process.env.TURN_URLS.split(',').map((u) => u.trim()).filter(Boolean)
            : null;
    }
    iceUrls() {
        if (this.customUrls)
            return this.customUrls;
        return [
            `stun:${this.coturnHost}:${this.stunPort}`,
            `turn:${this.coturnHost}:${this.turnPort}?transport=udp`,
            `turn:${this.coturnHost}:${this.turnPort}?transport=tcp`,
            `turns:${this.coturnHost}:5349?transport=tcp`,
        ];
    }
    generateCredentials(userId, ttlSeconds = 86400) {
        const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
        const username = `${timestamp}:${userId}`;
        const credential = crypto
            .createHmac('sha1', this.coturnSecret)
            .update(username)
            .digest('base64');
        return {
            urls: this.iceUrls(),
            username,
            credential,
            ttl: ttlSeconds,
            realm: this.turnRealm,
        };
    }
    getIceServers(userId) {
        const creds = this.generateCredentials(userId);
        const urls = this.iceUrls();
        const stunUrls = urls.filter((u) => u.startsWith('stun:'));
        const turnUrls = urls.filter((u) => !u.startsWith('stun:'));
        return {
            iceServers: [
                { urls: stunUrls.length ? stunUrls : [`stun:${this.coturnHost}:${this.stunPort}`] },
                {
                    urls: turnUrls.length ? turnUrls : [`turn:${this.coturnHost}:${this.turnPort}?transport=udp`],
                    username: creds.username,
                    credential: creds.credential,
                },
            ],
            realm: this.turnRealm,
        };
    }
};
exports.CoturnService = CoturnService;
exports.CoturnService = CoturnService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CoturnService);
//# sourceMappingURL=coturn.service.js.map