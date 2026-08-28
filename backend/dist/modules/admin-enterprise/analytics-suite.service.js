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
exports.AnalyticsSuiteService = void 0;
exports.zScoreAnomalies = zScoreAnomalies;
exports.buildCohorts = buildCohorts;
exports.funnelPct = funnelPct;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const orders_console_service_1 = require("./orders-console.service");
function zScoreAnomalies(series, opts = {}) {
    const { baselineDays = 14, threshold = 3, minBaseline = 5 } = opts;
    if (series.length < minBaseline + 1)
        return [];
    const out = [];
    for (let i = baselineDays; i < series.length; i++) {
        const base = series.slice(i - baselineDays, i).map((p) => p.value);
        const mean = base.reduce((a, b) => a + b, 0) / base.length;
        const variance = base.reduce((a, b) => a + (b - mean) ** 2, 0) / base.length;
        const sd = Math.sqrt(variance);
        if (sd === 0 && series[i].value === mean)
            continue;
        const z = sd === 0 ? (series[i].value > mean ? Infinity : -Infinity) : (series[i].value - mean) / sd;
        if (Math.abs(z) >= threshold)
            out.push({ date: series[i].date, value: series[i].value, z: Math.round(z * 100) / 100, direction: z > 0 ? 'spike' : 'drop' });
    }
    return out;
}
function buildCohorts(signups, activityDays) {
    const weekOf = (d) => {
        const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
        return t.toISOString().slice(0, 10);
    };
    const cohorts = new Map();
    for (const s of signups) {
        const w = weekOf(s.at);
        const c = cohorts.get(w) || { users: new Set(), createdAt: new Map() };
        c.users.add(s.userId);
        c.createdAt.set(s.userId, s.at);
        cohorts.set(w, c);
    }
    const results = [];
    for (const [week, c] of [...cohorts.entries()].sort()) {
        let d1 = 0, d7 = 0, d30 = 0;
        for (const uid of c.users) {
            const days = activityDays.get(uid);
            if (!days)
                continue;
            const created = c.createdAt.get(uid);
            const hasWithin = (n) => [...days].some((ds) => {
                const delta = (new Date(ds).getTime() - created.getTime()) / 86_400_000;
                return delta > 0 && delta <= n;
            });
            if (hasWithin(1))
                d1++;
            if (hasWithin(7))
                d7++;
            if (hasWithin(30))
                d30++;
        }
        results.push({
            cohort: week, size: c.users.size,
            d1: c.users.size ? Math.round((d1 / c.users.size) * 1000) / 10 : 0,
            d7: c.users.size ? Math.round((d7 / c.users.size) * 1000) / 10 : 0,
            d30: c.users.size ? Math.round((d30 / c.users.size) * 1000) / 10 : 0,
        });
    }
    return results;
}
function funnelPct(stage, from) {
    return from > 0 ? Math.round((stage / from) * 1000) / 10 : null;
}
let AnalyticsSuiteService = class AnalyticsSuiteService {
    constructor(conn) {
        this.conn = conn;
    }
    range(from, to) {
        const f = new Date(from), t = new Date(to);
        if (isNaN(f.getTime()) || isNaN(t.getTime()) || f > t)
            throw new common_1.BadRequestException('invalid_date_range');
        return { f, t };
    }
    async funnel(from, to) {
        const { f, t } = this.range(from, to);
        const users = this.conn.collection('users');
        const windowMatch = { role: 'patient', createdAt: { $gte: f, $lte: t } };
        const unionPipeline = orders_console_service_1.ORDER_KINDS.flatMap((k) => [
            { $group: { _id: `$${k.patientField}`, n: { $sum: 1 }, first_at: { $min: '$createdAt' } } },
        ].map((stage) => [
            { $match: {} },
            stage,
        ])).flat();
        void unionPipeline;
        const bookingCounts = await Promise.all(orders_console_service_1.ORDER_KINDS.map((k) => this.conn.collection(k.collection).aggregate([
            { $match: { createdAt: { $gte: f, $lte: t } } },
            { $group: { _id: `$${k.patientField}`, n: { $sum: 1 }, first_at: { $min: '$createdAt' } } },
        ]).toArray().catch(() => [])));
        const merged = new Map();
        for (const rows of bookingCounts)
            for (const r of rows)
                merged.set(String(r._id), (merged.get(String(r._id)) || 0) + r.n);
        const registeredRows = await users.find(windowMatch, { projection: { id: 1, verified: 1, acquisition_source: 1, source: 1 } }).toArray();
        const channelOf = (u) => String(u.acquisition_source || u.source || 'organic');
        const channels = new Map();
        for (const u of registeredRows) {
            const ch = channelOf(u);
            const row = channels.get(ch) || { registered: 0, verified: 0, first_booking: 0, repeat: 0 };
            row.registered += 1;
            if (u.verified)
                row.verified += 1;
            const bookings = merged.get(String(u.id)) || 0;
            if (bookings >= 1)
                row.first_booking += 1;
            if (bookings >= 2)
                row.repeat += 1;
            channels.set(ch, row);
        }
        return {
            range: { from, to },
            channels: [...channels.entries()].map(([channel, s]) => ({
                channel, ...s,
                conv_verified_pct: funnelPct(s.verified, s.registered),
                conv_first_pct: funnelPct(s.first_booking, s.registered),
                conv_repeat_pct: funnelPct(s.repeat, s.registered),
            })).sort((a, b) => b.registered - a.registered),
        };
    }
    async cohorts(from, to) {
        const { f, t } = this.range(from, to);
        const users = await this.conn.collection('users')
            .find({ role: 'patient', createdAt: { $gte: f, $lte: t } }, { projection: { id: 1, createdAt: 1 } })
            .limit(20000).toArray();
        const activity = new Map();
        const addAct = (uid, when) => {
            if (!uid || !when)
                return;
            const key = String(uid);
            const set = activity.get(key) || new Set();
            set.add(new Date(when).toISOString().slice(0, 10));
            activity.set(key, set);
        };
        await Promise.all(orders_console_service_1.ORDER_KINDS.map(async (k) => {
            const rows = await this.conn.collection(k.collection)
                .find({ patient_id: { $in: users.map((u) => u.id) } }, { projection: { patient_id: 1, createdAt: 1 } })
                .limit(50000).toArray().catch(() => []);
            for (const r of rows)
                addAct(r.patient_id, r.createdAt);
        }));
        const retention = buildCohorts(users.map((u) => ({ userId: u.id, at: new Date(u.createdAt) })), activity);
        const ids = users.map((u) => u.id);
        const ltvRows = await this.conn.collection('moyasar_payments').aggregate([
            { $match: { patient_id: { $in: ids }, status: { $in: ['paid', 'confirmed', 'succeeded'] } } },
            { $lookup: { from: 'users', localField: 'patient_id', foreignField: 'id', as: 'u' } },
            { $unwind: '$u' },
            { $group: { _id: '$patient_id', ltv: { $sum: '$amount' }, orders: { $sum: 1 } } },
        ]).toArray().catch(() => []);
        const ltvMap = new Map(ltvRows.map((r) => [r._id, r]));
        for (const c of retention) {
            const cohortUsers = users.filter((u) => u.id && ltvMap.has(u.id));
            void cohortUsers;
        }
        const cohortLtv = retention.map((c) => {
            const inCohort = users.filter((u) => {
                const wk = c.cohort;
                const created = new Date(u.createdAt);
                const tt = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()));
                tt.setUTCDate(tt.getUTCDate() - ((tt.getUTCDay() + 6) % 7));
                return tt.toISOString().slice(0, 10) === wk;
            });
            const sumLtv = inCohort.reduce((a, u) => a + Number(ltvMap.get(u.id)?.ltv || 0), 0);
            const payers = inCohort.filter((u) => ltvMap.has(u.id)).length;
            return { ...c, ltv_avg_payers: payers ? Math.round((sumLtv / payers) * 100) / 100 : 0, payers };
        });
        return { range: { from, to }, cohorts: cohortLtv };
    }
    async providerLeague(from, to, domain) {
        const { f, t } = this.range(from, to);
        const kinds = domain ? orders_console_service_1.ORDER_KINDS.filter((k) => k.kind === domain) : orders_console_service_1.ORDER_KINDS;
        const rows = [];
        for (const k of kinds) {
            if (!k.providerField)
                continue;
            const agg = await this.conn.collection(k.collection).aggregate([
                { $match: { createdAt: { $gte: f, $lte: t } } },
                { $group: {
                        _id: `$${k.providerField}`,
                        total: { $sum: 1 },
                        cancelled: { $sum: { $cond: [{ $in: [`$${k.stateField}`, k.cancelledStates] }, 1, 0] } },
                        completed: { $sum: { $cond: [{ $in: [`$${k.stateField}`, k.completedStates] }, 1, 0] } },
                        gmv: { $sum: { $ifNull: ['$total_price', '$total'] } },
                    } },
            ]).toArray().catch(() => []);
            for (const r of agg)
                rows.push({ kind: k.kind, provider_id: r._id, total: r.total, cancelled: r.cancelled, completed: r.completed, gmv: r.gmv });
        }
        const providerIds = [...new Set(rows.map((r) => r.provider_id).filter(Boolean))];
        const profiles = providerIds.length ? await this.conn.collection('provider_profiles').find({ id: { $in: providerIds } }, { projection: { id: 1, full_name: 1, name_ar: 1, name_en: 1 } }).toArray().catch(() => []) : [];
        const nameById = new Map(profiles.map((p) => [p.id, p.full_name || p.name_ar || p.name_en]));
        const ratingsAgg = providerIds.length ? await this.conn.collection('ratings').aggregate([
            { $match: { provider_id: { $in: providerIds } } },
            { $group: { _id: '$provider_id', avg_rating: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]).toArray().catch(() => []) : [];
        const ratingMap = new Map(ratingsAgg.map((r) => [r._id, r]));
        return rows.map((r) => ({
            ...r,
            provider_name: nameById.get(r.provider_id) || r.provider_id,
            cancel_rate_pct: r.total ? Math.round((r.cancelled / r.total) * 1000) / 10 : 0,
            completion_rate_pct: r.total ? Math.round(((r.completed || 0) / r.total) * 1000) / 10 : 0,
            avg_rating: ratingMap.get(r.provider_id) ? Math.round(Number(ratingMap.get(r.provider_id).avg_rating) * 10) / 10 : null,
            ratings_count: ratingMap.get(r.provider_id)?.count || 0,
        })).sort((a, b) => b.gmv - a.gmv);
    }
    async searchAnalytics(from, to) {
        const { f, t } = this.range(from, to);
        const events = this.conn.collection('analytics_events');
        const [top, zeroResults] = await Promise.all([
            events.aggregate([
                { $match: { event_type: 'search', createdAt: { $gte: f, $lte: t } } },
                { $group: { _id: '$metadata.query', count: { $sum: 1 }, domain: { $first: '$domain' } } },
                { $sort: { count: -1 } }, { $limit: 40 },
            ]).toArray().catch(() => []),
            events.aggregate([
                { $match: { event_type: 'search', createdAt: { $gte: f, $lte: t } } },
                { $match: { $or: [{ 'metadata.results': 0 }, { 'metadata.result_count': 0 }] } },
                { $group: { _id: '$metadata.query', count: { $sum: 1 }, domain: { $first: '$domain' } } },
                { $sort: { count: -1 } }, { $limit: 40 },
            ]).toArray().catch(() => []),
        ]);
        return { top_queries: top, zero_result_opportunities: zeroResults };
    }
    async nps(from, to) {
        const { f, t } = this.range(from, to);
        const rows = await this.conn.collection('ratings').aggregate([
            { $match: { createdAt: { $gte: f, $lte: t } } },
            { $group: { _id: '$rating', n: { $sum: 1 } } },
        ]).toArray().catch(() => []);
        const dist = Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
        const promoters = [9, 10].reduce((a, s) => a + (dist[s] || 0), 0);
        const detractors = [1, 2, 3, 4, 5, 6].reduce((a, s) => a + (dist[s] || 0), 0);
        const total = rows.reduce((a, r) => a + r.n, 0);
        return { total, distribution: dist, promoters, passives: (dist[7] || 0) + (dist[8] || 0), detractors, nps: total ? Math.round(((promoters - detractors) / total) * 1000) / 10 : null };
    }
    async anomalies(daysBack = 45) {
        const since = new Date(Date.now() - daysBack * 86_400_000);
        const dailyFromMatch = (col, stateField, states) => this.conn.collection(col).aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    total: { $sum: 1 },
                    flagged: { $sum: { $cond: [{ $in: [`$${stateField}`, states] }, 1, 0] } },
                } },
            { $sort: { _id: 1 } },
        ]).toArray().catch(() => []);
        const cancelSeries = [];
        const failSeries = [];
        await Promise.all([
            Promise.all(orders_console_service_1.ORDER_KINDS.map(async (k) => {
                const rows = await dailyFromMatch(k.collection, k.stateField, k.cancelledStates);
                for (const r of rows)
                    cancelSeries.push({ date: r._id, value: r.flagged });
            })),
            (async () => {
                const rows = await this.conn.collection('moyasar_payments').aggregate([
                    { $match: { createdAt: { $gte: since } } },
                    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }, total: { $sum: 1 } } },
                    { $sort: { _id: 1 } },
                ]).toArray().catch(() => []);
                for (const r of rows)
                    failSeries.push({ date: r._id, value: r.failed });
            })(),
        ]);
        const mergeSeries = (s) => {
            const m = new Map();
            for (const p of s)
                m.set(p.date, (m.get(p.date) || 0) + p.value);
            return [...m.entries()].sort().map(([date, value]) => ({ date, value }));
        };
        return {
            cancellation_anomalies: zScoreAnomalies(mergeSeries(cancelSeries)),
            payment_failure_anomalies: zScoreAnomalies(mergeSeries(failSeries)),
            window_days: daysBack,
        };
    }
};
exports.AnalyticsSuiteService = AnalyticsSuiteService;
exports.AnalyticsSuiteService = AnalyticsSuiteService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], AnalyticsSuiteService);
//# sourceMappingURL=analytics-suite.service.js.map