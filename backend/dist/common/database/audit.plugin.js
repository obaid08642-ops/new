"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditPlugin = AuditPlugin;
function AuditPlugin(schema, options) {
    schema.add({
        is_deleted: { type: Boolean, default: false },
        deleted_at: { type: Date, default: null },
        created_by: { type: String, default: null },
        updated_by: { type: String, default: null },
    });
    const types = ['find', 'findOne', 'findOneAndUpdate', 'count', 'countDocuments', 'updateMany'];
    types.forEach((type) => {
        schema.pre(type, function (next) {
            if (this.getQuery().is_deleted !== true) {
                this.where({ is_deleted: { $ne: true } });
            }
            next();
        });
    });
}
//# sourceMappingURL=audit.plugin.js.map