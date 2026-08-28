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
exports.AiGatewayService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const generative_ai_1 = require("@google/generative-ai");
const DEFAULT_PROVIDERS = [
    { key: 'gemini', enabled: true, api_key: '', model: 'gemini-2.0-flash', vision_model: 'gemini-2.0-flash', priority: 1, daily_quota: 1500, used_today: 0, usage_date: '', note: 'native SDK + vision' },
    { key: 'groq', enabled: true, api_key: '', model: 'llama-3.3-70b-versatile', vision_model: 'meta-llama/llama-4-scout-17b-16e-instruct', priority: 2, daily_quota: 1000, used_today: 0, usage_date: '', base_url: 'https://api.groq.com/openai/v1', note: 'fastest inference' },
    { key: 'openai', enabled: true, api_key: '', model: 'gpt-4o-mini', vision_model: 'gpt-4o-mini', priority: 3, daily_quota: 500, used_today: 0, usage_date: '' },
    { key: 'deepseek', enabled: true, api_key: '', model: 'deepseek-chat', priority: 4, daily_quota: 500, used_today: 0, usage_date: '', base_url: 'https://api.deepseek.com/v1' },
    { key: 'openrouter', enabled: true, api_key: '', model: 'meta-llama/llama-3.3-70b-instruct', vision_model: 'openai/gpt-4o-mini', priority: 5, daily_quota: 200, used_today: 0, usage_date: '', base_url: 'https://openrouter.ai/api/v1', note: 'aggregator fallback' },
    { key: 'cerebras', enabled: true, api_key: '', model: 'llama-4-scout-17b-16e-instruct', priority: 6, daily_quota: 1000, used_today: 0, usage_date: '', base_url: 'https://api.cerebras.ai/v1' },
    { key: 'qwen', enabled: true, api_key: '', model: 'qwen-plus', vision_model: 'qwen-vl-plus', priority: 7, daily_quota: 500, used_today: 0, usage_date: '', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    { key: 'replicate', enabled: false, api_key: '', model: 'stability-ai/sdxl', priority: 8, daily_quota: 100, used_today: 0, usage_date: '', note: 'image generation only — not a chat provider' },
];
let AiGatewayService = class AiGatewayService {
    constructor(conn) {
        this.conn = conn;
        this.logger = new common_1.Logger('AiGateway');
        this.genAI = null;
        this.registryCache = null;
        if (process.env.GEMINI_API_KEY) {
            this.genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }
    }
    get providers() { return this.conn.collection('ai_providers'); }
    get settings() { return this.conn.collection('featureflags'); }
    async ensureRegistry() {
        const count = await this.providers.countDocuments({});
        if (count > 0)
            return;
        const envKeys = {
            gemini: process.env.GEMINI_API_KEY || '',
            openai: process.env.OPENAI_API_KEY || '',
            groq: process.env.GROQ_API_KEY || '',
            cerebras: process.env.CEREBRAS_API_KEY || '',
            openrouter: process.env.OPENROUTER_API_KEY || '',
            deepseek: process.env.DEEPSEEK_API_KEY || '',
            qwen: process.env.QWEN_API_KEY || '',
            replicate: process.env.REPLICATE_API_TOKEN || '',
        };
        for (const p of DEFAULT_PROVIDERS) {
            await this.providers.updateOne({ key: p.key }, { $set: { ...p, api_key: envKeys[p.key] || '' } }, { upsert: true });
        }
        await this.settings.updateOne({ key: 'ai_mode' }, { $set: { key: 'ai_mode', value: 'auto', pinned_provider: null, enabled: true } }, { upsert: true });
        this.logger.log('AI provider registry seeded into DB');
    }
    async loadRegistry() {
        if (this.registryCache && Date.now() - this.registryCache.at < 20_000) {
            return { providers: this.registryCache.providers, mode: this.registryCache.mode, pinned: this.registryCache.pinned };
        }
        await this.ensureRegistry();
        const providers = (await this.providers.find({}).sort({ priority: 1 }).toArray());
        const modeDoc = await this.settings.findOne({ key: 'ai_mode' });
        const mode = (modeDoc?.value === 'manual' ? 'manual' : 'auto');
        const pinned = modeDoc?.pinned_provider || null;
        this.registryCache = { providers, mode, pinned, at: Date.now() };
        return { providers, mode, pinned };
    }
    today() {
        return new Date().toISOString().slice(0, 10);
    }
    async attemptChain() {
        const { providers, mode, pinned } = await this.loadRegistry();
        const today = this.today();
        const usable = (p) => p.enabled && p.api_key && (p.daily_quota === 0 || p.usage_date !== today || p.used_today < p.daily_quota);
        if (mode === 'manual' && pinned) {
            const p = providers.find((x) => x.key === pinned);
            return p && usable(p) ? [p] : providers.filter(usable);
        }
        return providers.filter(usable);
    }
    async generate(opts) {
        const chain = await this.attemptChain();
        if (chain.length === 0)
            throw new Error('NO_AI_PROVIDER_AVAILABLE');
        let lastErr = null;
        let fellBack = false;
        for (const p of chain) {
            const start = Date.now();
            try {
                const text = p.key === 'gemini'
                    ? await this.generateGemini(p, opts)
                    : await this.generateOpenAiCompat(p, opts);
                const elapsed = Date.now() - start;
                await this.recordUsage(p, opts.feature, elapsed, true, fellBack);
                return { text, provider: p.key, model: this.modelFor(p, !!opts.imageBase64), elapsed_ms: elapsed, fell_back: fellBack };
            }
            catch (e) {
                const elapsed = Date.now() - start;
                await this.recordUsage(p, opts.feature, elapsed, false, fellBack, e.message?.slice(0, 160));
                const msg = String(e.message || '');
                if (/429|rate.?limit|quota|insufficient|timeout|ECONN|ENOTFOUND|503|529|credit/i.test(msg)) {
                    this.logger.warn(`[AI-Gateway] ${p.key} failed (${msg.slice(0, 60)}) → fallback`);
                    fellBack = true;
                    lastErr = e;
                    continue;
                }
                fellBack = true;
                lastErr = e;
            }
        }
        throw lastErr || new Error('ALL_AI_PROVIDERS_FAILED');
    }
    modelFor(p, vision = false) {
        return vision ? (p.vision_model || p.model) : p.model;
    }
    async generateGemini(p, opts) {
        if (!this.genAI)
            this.genAI = new generative_ai_1.GoogleGenerativeAI(p.api_key);
        const model = this.genAI.getGenerativeModel({ model: this.modelFor(p, !!opts.imageBase64) });
        const payload = Array.isArray(opts.prompt) ? opts.prompt : [opts.prompt];
        if (opts.imageBase64) {
            payload.push({ inlineData: { data: opts.imageBase64, mimeType: opts.mimeType || 'image/jpeg' } });
        }
        const result = await model.generateContent(payload);
        return result.response.text();
    }
    async generateOpenAiCompat(p, opts) {
        const base = p.base_url || 'https://api.openai.com/v1';
        const content = [{ type: 'text', text: Array.isArray(opts.prompt) ? opts.prompt.join('\n') : opts.prompt }];
        if (opts.imageBase64) {
            content.push({ type: 'image_url', image_url: { url: `data:${opts.mimeType || 'image/jpeg'};base64,${opts.imageBase64}` } });
        }
        const headers = { Authorization: `Bearer ${p.api_key}`, 'Content-Type': 'application/json' };
        if (p.key === 'openrouter') {
            headers['HTTP-Referer'] = process.env.API_PUBLIC_URL || 'https://api.nabd.plus';
            headers['X-Title'] = 'Nabd';
        }
        const resp = await fetch(`${base}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ model: this.modelFor(p, !!opts.imageBase64), messages: [{ role: 'user', content }], temperature: 0.3 }),
            signal: AbortSignal.timeout(30_000),
        });
        if (!resp.ok) {
            const body = await resp.text();
            throw new Error(`${p.key}_http_${resp.status}: ${body.slice(0, 150)}`);
        }
        const json = await resp.json();
        const text = json?.choices?.[0]?.message?.content;
        if (!text)
            throw new Error(`${p.key}_empty_response`);
        return text;
    }
    async recordUsage(p, feature, ms, ok, fellBack, error) {
        const today = this.today();
        await this.providers.updateOne({ key: p.key }, [
            { $set: { used_today: { $cond: [{ $eq: ['$usage_date', today] }, { $add: ['$used_today', 1] }, 1] }, usage_date: today } },
        ]).catch(() => { });
        await this.conn.collection('ai_usage').insertOne({
            provider: p.key, model: this.modelFor(p), feature,
            elapsed_ms: ms, ok, fell_back: fellBack, error: error || null,
            createdAt: new Date(),
        }).catch(() => { });
    }
    async listProviders() {
        await this.ensureRegistry();
        const providers = await this.providers.find({}).sort({ priority: 1 }).toArray();
        const modeDoc = await this.settings.findOne({ key: 'ai_mode' });
        return {
            mode: modeDoc?.value || 'auto',
            pinned_provider: modeDoc?.pinned_provider || null,
            providers: providers.map((p) => ({
                key: p.key, enabled: p.enabled, model: p.model, vision_model: p.vision_model,
                priority: p.priority, daily_quota: p.daily_quota, used_today: p.used_today,
                has_key: !!p.api_key, note: p.note,
            })),
        };
    }
    async updateProvider(key, patch) {
        await this.ensureRegistry();
        await this.providers.updateOne({ key }, { $set: { ...patch, updatedAt: new Date() } });
        this.registryCache = null;
        return { ok: true, key, patch };
    }
    async setMode(mode, pinned) {
        await this.settings.updateOne({ key: 'ai_mode' }, { $set: { key: 'ai_mode', value: mode, pinned_provider: mode === 'manual' ? (pinned || null) : null, enabled: true, updatedAt: new Date() } }, { upsert: true });
        this.registryCache = null;
        return { ok: true, mode, pinned_provider: mode === 'manual' ? pinned : null };
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
                    fallbacks: { $sum: { $cond: ['$fell_back', 1, 0] } },
                    avg_ms: { $avg: '$elapsed_ms' },
                },
            },
            { $sort: { calls: -1 } },
            { $limit: 60 },
        ]).toArray();
    }
};
exports.AiGatewayService = AiGatewayService;
exports.AiGatewayService = AiGatewayService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], AiGatewayService);
//# sourceMappingURL=ai-gateway.service.js.map