"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiProviderService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const generative_ai_1 = require("@google/generative-ai");
const OPENAI_COMPAT = {
    openai: {
        base: 'https://api.openai.com/v1',
        keyEnv: 'OPENAI_API_KEY',
        modelEnv: 'OPENAI_MODEL',
        defaultModel: 'gpt-4o-mini',
    },
    openrouter: {
        base: 'https://openrouter.ai/api/v1',
        keyEnv: 'OPENROUTER_API_KEY',
        modelEnv: 'OPENROUTER_MODEL',
        defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    },
    groq: {
        base: 'https://api.groq.com/openai/v1',
        keyEnv: 'GROQ_API_KEY',
        modelEnv: 'GROQ_MODEL',
        defaultModel: 'llama-3.3-70b-versatile',
    },
};
let AiProviderService = class AiProviderService {
    constructor(conn) {
        this.conn = conn;
        this.logger = new common_1.Logger('AiProviderService');
        this.genAI = null;
        this.cachedProvider = null;
        if (process.env.GEMINI_API_KEY) {
            this.genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }
    }
    get activeProvider() {
        if (this.cachedProvider && Date.now() - this.cachedProvider.at < 30_000) {
            return this.cachedProvider.name;
        }
        let name = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
        try {
            this.conn.collection('featureflags').findOne({ key: 'ai_provider' }).then((doc) => {
                if (doc?.value && ['gemini', 'openai', 'openrouter', 'groq'].includes(doc.value)) {
                    this.cachedProvider = { name: doc.value, at: Date.now() };
                }
                else {
                    this.cachedProvider = { name, at: Date.now() };
                }
            }).catch(() => { });
        }
        catch { }
        if (!['gemini', 'openai', 'openrouter', 'groq'].includes(name))
            name = 'gemini';
        return this.cachedProvider?.name || name;
    }
    async setActiveProvider(provider) {
        if (!['gemini', 'openai', 'openrouter', 'groq'].includes(provider)) {
            throw new Error('INVALID_PROVIDER');
        }
        await this.conn.collection('featureflags').updateOne({ key: 'ai_provider' }, { $set: { key: 'ai_provider', value: provider, enabled: true, updatedAt: new Date() } }, { upsert: true });
        this.cachedProvider = { name: provider, at: Date.now() };
        return { ok: true, active_provider: provider };
    }
    trackUsage(provider, model, feature, elapsedMs, ok, tokens) {
        this.conn.collection('ai_usage').insertOne({
            provider, model, feature,
            elapsed_ms: elapsedMs,
            ok,
            prompt_tokens: tokens?.prompt || null,
            completion_tokens: tokens?.completion || null,
            createdAt: new Date(),
        }).catch(() => { });
    }
    async usageReport(days = 7) {
        const since = new Date(Date.now() - days * 24 * 3600 * 1000);
        return this.conn.collection('ai_usage').aggregate([
            { $match: { createdAt: { $gte: since } } },
            {
                $group: {
                    _id: { provider: '$provider', model: '$model', feature: '$feature' },
                    calls: { $sum: 1 },
                    failures: { $sum: { $cond: [{ $eq: ['$ok', false] }, 1, 0] } },
                    avg_ms: { $avg: '$elapsed_ms' },
                    prompt_tokens: { $sum: { $ifNull: ['$prompt_tokens', 0] } },
                    completion_tokens: { $sum: { $ifNull: ['$completion_tokens', 0] } },
                },
            },
            { $sort: { calls: -1 } },
            { $limit: 50 },
        ]).toArray();
    }
    providerChain() {
        const chain = [this.activeProvider];
        for (const p of ['gemini', 'openai', 'openrouter', 'groq']) {
            if (p !== this.activeProvider && this.hasKey(p))
                chain.push(p);
        }
        return chain.filter((p) => this.hasKey(p));
    }
    hasKey(p) {
        if (p === 'gemini')
            return !!process.env.GEMINI_API_KEY;
        return !!process.env[OPENAI_COMPAT[p].keyEnv];
    }
    modelFor(p, vision = false) {
        if (vision && process.env.AI_VISION_MODEL)
            return process.env.AI_VISION_MODEL;
        if (process.env.AI_MODEL)
            return process.env.AI_MODEL;
        if (p === 'gemini')
            return process.env.GEMINI_MODEL || (vision ? 'gemini-2.0-flash' : 'gemini-2.0-flash');
        if (vision && p === 'groq')
            return process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
        return process.env[OPENAI_COMPAT[p].modelEnv] || OPENAI_COMPAT[p].defaultModel;
    }
    async generate(opts) {
        const chain = this.providerChain();
        if (chain.length === 0)
            throw new Error('NO_AI_PROVIDER_CONFIGURED');
        let lastErr = null;
        for (const provider of chain) {
            const start = Date.now();
            try {
                const text = provider === 'gemini'
                    ? await this.generateGemini(opts)
                    : await this.generateOpenAiCompat(provider, opts);
                const model = this.modelFor(provider, !!opts.imageBase64);
                this.trackUsage(provider, model, opts.feature, Date.now() - start, true);
                this.logger.log(`[AI][${opts.feature}] provider=${provider} model=${model} time=${Date.now() - start}ms`);
                return { text, provider, model, elapsed_ms: Date.now() - start };
            }
            catch (e) {
                this.trackUsage(provider, this.modelFor(provider, !!opts.imageBase64), opts.feature, Date.now() - start, false);
                this.logger.warn(`[AI][${opts.feature}] provider=${provider} failed: ${e.message}`);
                lastErr = e;
            }
        }
        throw lastErr || new Error('ALL_AI_PROVIDERS_FAILED');
    }
    async generateGemini(opts) {
        if (!this.genAI)
            throw new Error('gemini_not_configured');
        const model = this.genAI.getGenerativeModel({ model: this.modelFor('gemini', !!opts.imageBase64) });
        const payload = Array.isArray(opts.prompt) ? opts.prompt : [opts.prompt];
        if (opts.imageBase64) {
            payload.push({ inlineData: { data: opts.imageBase64, mimeType: opts.mimeType || 'image/jpeg' } });
        }
        const result = await model.generateContent(payload);
        return result.response.text();
    }
    async generateOpenAiCompat(provider, opts) {
        const conf = OPENAI_COMPAT[provider];
        const apiKey = process.env[conf.keyEnv];
        if (!apiKey)
            throw new Error(`${provider}_not_configured`);
        const content = [{ type: 'text', text: Array.isArray(opts.prompt) ? opts.prompt.join('\n') : opts.prompt }];
        if (opts.imageBase64) {
            content.push({
                type: 'image_url',
                image_url: { url: `data:${opts.mimeType || 'image/jpeg'};base64,${opts.imageBase64}` },
            });
        }
        const resp = await fetch(`${conf.base}/chat/completions`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.modelFor(provider, !!opts.imageBase64),
                messages: [{ role: 'user', content }],
                temperature: 0.3,
            }),
        });
        if (!resp.ok)
            throw new Error(`${provider}_http_${resp.status}: ${(await resp.text()).slice(0, 200)}`);
        const json = await resp.json();
        const text = json?.choices?.[0]?.message?.content;
        if (!text)
            throw new Error(`${provider}_empty_response`);
        return text;
    }
    getConfig() {
        return {
            active_provider: this.activeProvider,
            configured: {
                gemini: !!process.env.GEMINI_API_KEY,
                openai: !!process.env.OPENAI_API_KEY,
                openrouter: !!process.env.OPENROUTER_API_KEY,
                groq: !!process.env.GROQ_API_KEY,
            },
            models: {
                text: this.modelFor(this.activeProvider),
                vision: this.modelFor(this.activeProvider, true),
            },
            switchable_via: 'AI_PROVIDER env (gemini|openai|openrouter|groq) — no code change needed',
        };
    }
};
exports.AiProviderService = AiProviderService;
exports.AiProviderService = AiProviderService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], AiProviderService);
//# sourceMappingURL=ai-provider.service.js.map