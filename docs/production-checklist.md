# Production Checklist — Go-Live

- [x] RLS: provider_deltas + patient isolation (user_id checks in support, orders)
- [x] Webhooks: Stripe/LiveKit verified (idempotency-key + webhook verify)
- [x] Stripe: idempotency-key on all POST via BFF allowlist
- [x] Secrets: LIVEKIT keys, DB_URL via env (not code)
- [x] Grants: RBAC ADMIN only for /admin/*
- [x] Mobile UX 375px: patient-web responsive + product page 6 schemas
- [x] 21k sitemap + llms-full.txt pagination 21 pages

Ready for Go-Live.
