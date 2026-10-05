# 14.15 Hot-path indexes

Declared on the Mongoose schemas, so Mongoose builds them at startup (autoIndex
is on). Proven by `modules/notifications/push-fanout-indexes.mongo.spec.ts`.

| Collection | Query | Index (schema) |
|---|---|---|
| `insurance_companies` | catalogs `insuranceCatalog()`: `find({ is_active: true }).sort({ name_en: 1 })` | `{ is_active: 1, name_en: 1 }` (`schemas/insurance.schema.ts`) |
| `insurance_networks` | catalogs `insuranceCatalog()`: `find({ catalog_status: { $ne: 'retired' } })` | `{ catalog_status: 1, company_id: 1 }` (`schemas/insurance.schema.ts`) |
| `notification_templates` | `listTemplates()`: `find({}).sort({ key: 1 })` | unique `{ key: 1 }` (`schemas/notification-template.schema.ts`) |
| `pushtokens` | `sendPush()`: `find({ user_id, active: true })`, every active token, Expo batches of 100, FCM batches of 500 | `{ user_id: 1, active: 1 }` (`modules/push/push.module.ts`) |
| `provider_otp_codes` | TTL: removed one day after `expires_at` | `{ expires_at: 1 }`, `expireAfterSeconds: 86400` (`modules/provider/schemas/index.ts`) |
| `seo_controls` | `loadControls()`: `find({}).limit(100)`, 30 s cache | none (fewer than 100 documents) |
