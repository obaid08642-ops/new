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
exports.ExportService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ExportService = class ExportService {
    constructor(connection) {
        this.connection = connection;
    }
    async exportToCsv(modelName, fields) {
        const model = this.connection.model(modelName);
        if (!model)
            throw new common_1.NotFoundException(`Model ${modelName} not found`);
        const data = await model.find().lean();
        let csv = '\uFEFF' + fields.join(',') + '\n';
        for (const row of data) {
            const line = fields.map(field => {
                let val = row[field];
                if (val === undefined || val === null)
                    return '';
                if (val instanceof Date)
                    return val.toISOString();
                if (typeof val === 'object')
                    val = JSON.stringify(val);
                val = String(val).replace(/"/g, '""');
                if (val.includes(',') || val.includes('\n') || val.includes('"')) {
                    val = `"${val}"`;
                }
                return val;
            });
            csv += line.join(',') + '\n';
        }
        return csv;
    }
    async exportPatients() {
        const fields = ['id', 'full_name', 'phone', 'email', 'role', 'active', 'preferred_lang', 'createdAt'];
        return this.exportToCsv('User', fields);
    }
    async exportAppointments() {
        const fields = ['id', 'mode', 'status', 'patient_id', 'doctor_id', 'scheduled_at', 'price', 'createdAt'];
        return this.exportToCsv('Appointment', fields);
    }
    async exportOrders() {
        const fields = ['id', 'state', 'payment_status', 'amount_total', 'patient_id', 'pharmacy_id', 'createdAt'];
        return this.exportToCsv('Order', fields);
    }
    async exportTransactions() {
        const fields = ['id', 'payment_provider', 'amount', 'status', 'patient_id', 'booking_id', 'createdAt'];
        return this.exportToCsv('Transaction', fields);
    }
    async exportAuditLogs() {
        const fields = ['id', 'action', 'user_id', 'role', 'ip', 'user_agent', 'severity', 'createdAt'];
        return this.exportToCsv('AuditLog', fields);
    }
};
exports.ExportService = ExportService;
exports.ExportService = ExportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ExportService);
//# sourceMappingURL=export.service.js.map