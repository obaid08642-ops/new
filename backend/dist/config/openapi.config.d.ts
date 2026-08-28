import { INestApplication } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
export declare const NABDAH_PUBLIC_API_V1_URL = "https://api.nabd.plus/api/v1";
export declare const NABDAH_LOCAL_API_V1_URL = "http://localhost:8002/api/v1";
export declare const NABDAH_ACCESS_TOKEN_SECURITY_SCHEME = "access-token";
export declare function buildNabdahOpenApiConfig(): Omit<OpenAPIObject, "paths">;
export declare function createNabdahOpenApiDocument(app: INestApplication): OpenAPIObject;
