"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotationSchema = void 0;
const mongoose_1 = require("mongoose");
const procurement_status_enum_1 = require("../enums/procurement-status.enum");
exports.QuotationSchema = new mongoose_1.Schema({
    procurementRequestId: { type: String, required: true, ref: 'ProcurementRequest' },
    adminId: { type: String, required: true },
    items: [
        {
            medicineId: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
        },
    ],
    totalPrice: { type: Number, required: true },
    status: {
        type: String,
        enum: Object.values(procurement_status_enum_1.ProcurementStatus),
        default: procurement_status_enum_1.ProcurementStatus.QUOTATION_ISSUED,
    },
    adminNotes: { type: String },
    pharmacyFeedback: { type: String },
}, { timestamps: true });
//# sourceMappingURL=quotation.schema.js.map