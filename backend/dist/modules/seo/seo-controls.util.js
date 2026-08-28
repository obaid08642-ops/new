"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTITY_ROUTE_KEYS = void 0;
exports.controlsMap = controlsMap;
exports.isTypeIndexable = isTypeIndexable;
exports.robotsDisallowLines = robotsDisallowLines;
exports.ENTITY_ROUTE_KEYS = {
    medicine: 'medicine-catalog',
    doctor: 'doctors',
    'lab-service': 'lab-services',
    'home-care-service': 'home-care',
    facility: 'facilities',
    article: 'articles',
};
function controlsMap(rows) {
    const m = new Map();
    for (const r of rows || []) {
        if (r?.route_key)
            m.set(String(r.route_key).toLowerCase(), !!r.indexable);
    }
    return m;
}
function isTypeIndexable(type, controls) {
    const key = exports.ENTITY_ROUTE_KEYS[type] || type;
    const v = controls.get(key.toLowerCase());
    return v !== false;
}
function robotsDisallowLines(controls) {
    const lines = [];
    for (const [type, key] of Object.entries(exports.ENTITY_ROUTE_KEYS)) {
        if (controls.get(key.toLowerCase()) === false) {
            lines.push(`Disallow: /s/${type}/`);
        }
    }
    return lines;
}
//# sourceMappingURL=seo-controls.util.js.map