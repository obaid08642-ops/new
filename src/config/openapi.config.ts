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
  return document;
}
