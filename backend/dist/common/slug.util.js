"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
exports.buildSlug = buildSlug;
exports.parseSlugSuffix = parseSlugSuffix;
const AR_MAP = {
    ا: 'a', أ: 'a', إ: 'i', آ: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
    د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z',
    ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w',
    ي: 'y', ى: 'a', ئ: 'i', ء: '', ؤ: 'u', ة: 'a', ـ: '-',
};
function slugify(input, maxLen = 60) {
    if (!input)
        return 'item';
    let out = '';
    for (const ch of input.toLowerCase()) {
        if (AR_MAP[ch] !== undefined)
            out += AR_MAP[ch];
        else if (/[a-z0-9]/.test(ch))
            out += ch;
        else
            out += '-';
    }
    out = out.replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, maxLen);
    return out || 'item';
}
function buildSlug(name, id) {
    const base = slugify(name);
    const sfx = (id || '').replace(/-/g, '').slice(0, 6).toLowerCase();
    return `${base}-${sfx}`;
}
function parseSlugSuffix(slug) {
    if (!slug)
        return null;
    const m = slug.match(/-([a-f0-9]{6})$/i);
    return m ? m[1].toLowerCase() : null;
}
//# sourceMappingURL=slug.util.js.map