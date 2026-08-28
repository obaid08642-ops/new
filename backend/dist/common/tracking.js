"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRACK_PREFIX = void 0;
exports.trackingId = trackingId;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function trackingId(prefix) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    let suffix = '';
    for (let i = 0; i < 5; i++)
        suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return `${prefix.toUpperCase()}-${yy}${mm}-${suffix}`;
}
exports.TRACK_PREFIX = {
    order: 'PH',
    appointment: 'APT',
    lab_booking: 'LAB',
    home_care: 'HC',
    prescription: 'RX',
    lab_result: 'RES',
    support: 'SUP',
    radiology_booking: 'RAD',
    radiology_report: 'RPT',
    medical_report: 'MR',
};
//# sourceMappingURL=tracking.js.map