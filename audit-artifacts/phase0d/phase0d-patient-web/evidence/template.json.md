# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `template.json`
- **Member SHA-256:** `850fbd4ca13a5636867453db0dc99fc5f722953b37a9c3f5ee4c2d7ff1781736`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: "drizzle/schema.ts": "import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from \"drizzle-orm/mysql-core\";\n\n/**\n * Core user table backing auth flow.\n * Extend this file with additional tables as your product grows.\n * Colu`
- `13: "server/db.ts": "import { eq } from \"drizzle-orm\";\nimport { drizzle } from \"drizzle-orm/mysql2\";\nimport { InsertUser, users } from \"../drizzle/schema\";\nimport { ENV } from './_core/env';\n\nlet _db: ReturnType<typeof drizzle> | nul`
- `14: "server/routers.ts": "import { COOKIE_NAME } from \"@shared/const\";\nimport { getSessionCookieOptions } from \"./_core/cookies\";\nimport { systemRouter } from \"./_core/systemRouter\";\nimport { publicProcedure, router } from \"./_core/tr`
- `15: "client/index.html": "<!doctype html>\n<html lang=\"en\">\n\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta\n      name=\"viewport\"\n      content=\"width=device-width, initial-scale=1.0, maximum-scale=1\" />\n    <title>نبض بلس</titl`
- `16: "client/src/App.tsx": "import { Toaster } from \"@/components/ui/sonner\";\nimport { TooltipProvider } from \"@/components/ui/tooltip\";\nimport NotFound from \"@/pages/NotFound\";\nimport { Route, Switch } from \"wouter\";\nimport ErrorBou`
- `17: "client/src/lib/trpc.ts": "import { createTRPCReact } from \"@trpc/react-query\";\nimport type { AppRouter } from \"../../../server/routers\";\n\nexport const trpc = createTRPCReact<AppRouter>();",`
- `18: "client/src/pages/Home.tsx": "import { useAuth } from \"@/_core/hooks/useAuth\";\nimport { Button } from \"@/components/ui/button\";\nimport { Loader2 } from \"lucide-react\";\nimport { Streamdown } from 'streamdown';\n\n/**\n * All content`
- `19: "server/auth.logout.test.ts": "import { describe, expect, it } from \"vitest\";\nimport { appRouter } from \"./routers\";\nimport { COOKIE_NAME } from \"../shared/const\";\nimport type { TrpcContext } from \"./_core/context\";\n\ntype Cooki`
### backend_consumers_or_contracts
- `11: "package.json": "{\n  \"name\": \"nabd-plus-web\",\n  \"version\": \"1.0.0\",\n  \"type\": \"module\",\n  \"license\": \"MIT\",\n  \"scripts\": {\n    \"dev\": \"NODE_ENV=development tsx watch server/_core/index.ts\",\n    \"build\": \"vite`
- `14: "server/routers.ts": "import { COOKIE_NAME } from \"@shared/const\";\nimport { getSessionCookieOptions } from \"./_core/cookies\";\nimport { systemRouter } from \"./_core/systemRouter\";\nimport { publicProcedure, router } from \"./_core/tr`
- `17: "client/src/lib/trpc.ts": "import { createTRPCReact } from \"@trpc/react-query\";\nimport type { AppRouter } from \"../../../server/routers\";\n\nexport const trpc = createTRPCReact<AppRouter>();",`
- `19: "server/auth.logout.test.ts": "import { describe, expect, it } from \"vitest\";\nimport { appRouter } from \"./routers\";\nimport { COOKIE_NAME } from \"../shared/const\";\nimport type { TrpcContext } from \"./_core/context\";\n\ntype Cooki`
### auth_ownership
- `11: "package.json": "{\n  \"name\": \"nabd-plus-web\",\n  \"version\": \"1.0.0\",\n  \"type\": \"module\",\n  \"license\": \"MIT\",\n  \"scripts\": {\n    \"dev\": \"NODE_ENV=development tsx watch server/_core/index.ts\",\n    \"build\": \"vite`
- `12: "drizzle/schema.ts": "import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from \"drizzle-orm/mysql-core\";\n\n/**\n * Core user table backing auth flow.\n * Extend this file with additional tables as your product grows.\n * Colu`
- `13: "server/db.ts": "import { eq } from \"drizzle-orm\";\nimport { drizzle } from \"drizzle-orm/mysql2\";\nimport { InsertUser, users } from \"../drizzle/schema\";\nimport { ENV } from './_core/env';\n\nlet _db: ReturnType<typeof drizzle> | nul`
- `14: "server/routers.ts": "import { COOKIE_NAME } from \"@shared/const\";\nimport { getSessionCookieOptions } from \"./_core/cookies\";\nimport { systemRouter } from \"./_core/systemRouter\";\nimport { publicProcedure, router } from \"./_core/tr`
- `18: "client/src/pages/Home.tsx": "import { useAuth } from \"@/_core/hooks/useAuth\";\nimport { Button } from \"@/components/ui/button\";\nimport { Loader2 } from \"lucide-react\";\nimport { Streamdown } from 'streamdown';\n\n/**\n * All content`
- `19: "server/auth.logout.test.ts": "import { describe, expect, it } from \"vitest\";\nimport { appRouter } from \"./routers\";\nimport { COOKIE_NAME } from \"../shared/const\";\nimport type { TrpcContext } from \"./_core/context\";\n\ntype Cooki`
### state_transitions
- `13: "server/db.ts": "import { eq } from \"drizzle-orm\";\nimport { drizzle } from \"drizzle-orm/mysql2\";\nimport { InsertUser, users } from \"../drizzle/schema\";\nimport { ENV } from './_core/env';\n\nlet _db: ReturnType<typeof drizzle> | nul`
- `14: "server/routers.ts": "import { COOKIE_NAME } from \"@shared/const\";\nimport { getSessionCookieOptions } from \"./_core/cookies\";\nimport { systemRouter } from \"./_core/systemRouter\";\nimport { publicProcedure, router } from \"./_core/tr`
- `16: "client/src/App.tsx": "import { Toaster } from \"@/components/ui/sonner\";\nimport { TooltipProvider } from \"@/components/ui/tooltip\";\nimport NotFound from \"@/pages/NotFound\";\nimport { Route, Switch } from \"wouter\";\nimport ErrorBou`
- `18: "client/src/pages/Home.tsx": "import { useAuth } from \"@/_core/hooks/useAuth\";\nimport { Button } from \"@/components/ui/button\";\nimport { Loader2 } from \"lucide-react\";\nimport { Streamdown } from 'streamdown';\n\n/**\n * All content`
- `19: "server/auth.logout.test.ts": "import { describe, expect, it } from \"vitest\";\nimport { appRouter } from \"./routers\";\nimport { COOKIE_NAME } from \"../shared/const\";\nimport type { TrpcContext } from \"./_core/context\";\n\ntype Cooki`
### payment_insurance_relevance
- `11: "package.json": "{\n  \"name\": \"nabd-plus-web\",\n  \"version\": \"1.0.0\",\n  \"type\": \"module\",\n  \"license\": \"MIT\",\n  \"scripts\": {\n    \"dev\": \"NODE_ENV=development tsx watch server/_core/index.ts\",\n    \"build\": \"vite`
### error_empty_loading_retry_cancel
- `13: "server/db.ts": "import { eq } from \"drizzle-orm\";\nimport { drizzle } from \"drizzle-orm/mysql2\";\nimport { InsertUser, users } from \"../drizzle/schema\";\nimport { ENV } from './_core/env';\n\nlet _db: ReturnType<typeof drizzle> | nul`
- `16: "client/src/App.tsx": "import { Toaster } from \"@/components/ui/sonner\";\nimport { TooltipProvider } from \"@/components/ui/tooltip\";\nimport NotFound from \"@/pages/NotFound\";\nimport { Route, Switch } from \"wouter\";\nimport ErrorBou`
- `18: "client/src/pages/Home.tsx": "import { useAuth } from \"@/_core/hooks/useAuth\";\nimport { Button } from \"@/components/ui/button\";\nimport { Loader2 } from \"lucide-react\";\nimport { Streamdown } from 'streamdown';\n\n/**\n * All content`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
