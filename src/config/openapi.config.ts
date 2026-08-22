import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/**
 * The deployed public base URL already contains the URI version. Nest's
 * Swagger scanner emits `/v1/...` paths for URI-versioned controllers, so the
 * document normalizes that prefix before it is served. This keeps every
 * documented operation resolvable as `https://api.nabd.plus/api/v1` + path.
 */
export const NABDAH_PUBLIC_API_V1_URL = 'https://api.nabd.plus/api/v1';
export const NABDAH_LOCAL_API_V1_URL = 'http://localhost:8002/api/v1';
export const NABDAH_ACCESS_TOKEN_SECURITY_SCHEME = 'access-token';

export function buildNabdahOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('Nabdah Plus Enterprise API')
    .setDescription([
      'The Nabdah Plus versioned backend API.',
      '',
      '**Authentication.** Protected operations require an `Authorization: Bearer <JWT>` header using the `access-token` scheme.',
      '**Authorization.** JWT authentication does not carry OAuth scopes in this API. Each operation documents its required account role and ownership constraints; clients must not infer authorization from authentication alone.',
      '**Compatibility.** Legacy operations remain documented only while supported and are marked deprecated with their canonical replacement.',
    ].join('\n'))
    .setVersion('2.0.0')
    .addServer(NABDAH_PUBLIC_API_V1_URL, 'Production API v1')
    .addServer(NABDAH_LOCAL_API_V1_URL, 'Local development API v1')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'A valid Nabdah access token. Roles and record ownership are enforced by the endpoint.',
    }, NABDAH_ACCESS_TOKEN_SECURITY_SCHEME)
    .build();
}

export function createNabdahOpenApiDocument(app: INestApplication): OpenAPIObject {
  const document = SwaggerModule.createDocument(app, buildNabdahOpenApiConfig());
  const normalizedPaths = Object.entries(document.paths).map(([path, item]) => [
    path.replace(/^\/api\/v1(?=\/|$)|^\/v1(?=\/|$)/, '') || '/',
    item,
  ]);

  document.paths = Object.fromEntries(normalizedPaths);
  addPatientContractPackPaths(document);
  return document;
}

/**
 * Explicit documentation for the contract-pack routes that are implemented in
 * this branch. Do not add aspirational endpoints here: the OpenAPI document is
 * a deployable client contract, not a roadmap.
 */
function addPatientContractPackPaths(document: OpenAPIObject) {
  const paths: any = document.paths;
  const json = { 'application/json': { schema: { type: 'object' } } };
  const bearer = [{ [NABDAH_ACCESS_TOKEN_SECURITY_SCHEME]: [] }];
  const idempotency = [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } }];
  Object.assign(paths, {
    '/auth/otp/request': {
      post: { summary: 'Request an opaque patient OTP', requestBody: { required: true, content: json }, responses: { 200: { description: 'Opaque delivery result', content: json }, 429: { description: 'Rate limited', content: json } } },
    },
    '/auth/otp/verify': {
      post: { summary: 'Verify a patient OTP and issue a 60-second exchange token', requestBody: { required: true, content: json }, responses: { 200: { description: 'Exchange token', content: json }, 401: { description: 'Invalid OTP', content: json }, 410: { description: 'Expired OTP', content: json }, 429: { description: 'Locked', content: json } } },
    },
    '/auth/session/exchange': {
      post: { summary: 'Exchange the one-time token for HttpOnly cookies', requestBody: { required: true, content: json }, responses: { 200: { description: 'Authenticated; no tokens in response body', content: json }, 401: { description: 'Invalid or consumed exchange token', content: json } } },
    },
    '/users/me/display': {
      get: { summary: 'Get bounded patient display DTO', security: bearer, responses: { 200: { description: 'Display DTO without PII', content: json }, 401: { description: 'Unauthenticated', content: json } } },
    },
    '/users/me': {
      patch: { summary: 'Update allowlisted patient display and health profile', security: bearer, requestBody: { required: true, content: json }, responses: { 200: { description: 'Display DTO', content: json }, 400: { description: 'Invalid allowlist field', content: json }, 401: { description: 'Unauthenticated', content: json } } },
    },
    '/users/me/health-id': {
      get: { summary: 'Issue a signed five-minute health ID QR payload', security: bearer, responses: { 200: { description: 'Health ID DTO', content: json }, 401: { description: 'Unauthenticated', content: json } } },
    },
    '/health/vitals-log': {
      get: { summary: 'List real patient vital readings only', security: bearer, responses: { 200: { description: 'Vital log items', content: json }, 401: { description: 'Unauthenticated', content: json } } },
    },
    '/health/vitals': {
      post: { summary: 'Create a patient-owned vital reading', security: bearer, parameters: idempotency, requestBody: { required: true, content: json }, responses: { 201: { description: 'Reading identifier', content: json }, 400: { description: 'Invalid reading or idempotency key', content: json }, 401: { description: 'Unauthenticated', content: json } } },
    },
    '/cart/items': {
      post: { summary: 'Add a pharmacy cart item resolved by the server catalog', security: bearer, requestBody: { required: true, content: json }, responses: { 201: { description: 'Cart result', content: json }, 404: { description: 'Medicine not found', content: json } } },
    },
  });
}
