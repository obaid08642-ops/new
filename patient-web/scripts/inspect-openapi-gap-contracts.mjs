import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const sources = [
  "/home/ubuntu/upload/nabd-patient-api-openapi.json",
  "/home/ubuntu/upload/nabd-patient-api-openapi(2).json",
];

const targets = {
  homeCareDetail: /^\/api\/v1\/home-care\/bookings\/\{[^}]+\}$/,
  prescriptionDetail: /^\/api\/v1\/prescriptions\/\{[^}]+\}$/,
  chatThreadDetail: /^\/api\/v1\/chat\/threads\/\{[^}]+\}$/,
  otpVerify: /^\/api\/v1\/auth\/verify-otp$/,
  publishedMedicineDetail: /^\/api\/v1\/public\/catalogue\/medicines\/\{[^}]+\}$/,
  publishedMedicineList: /^\/api\/v1\/public\/catalogue$/,
};

function matchingOperations(paths, pattern) {
  return Object.entries(paths)
    .filter(([path]) => pattern.test(path))
    .map(([path, operations]) => ({
      path,
      methods: Object.entries(operations)
        .filter(([method]) => ["get", "post", "put", "patch", "delete"].includes(method))
        .map(([method, operation]) => ({
          method,
          hasSecurity: Array.isArray(operation.security),
          responseStatusCodes: Object.keys(operation.responses ?? {}).sort(),
          hasResponseSchema: Object.values(operation.responses ?? {}).some((response) => Boolean(response?.content)),
        })),
    }));
}

for (const source of sources) {
  const specification = JSON.parse(await readFile(source, "utf8"));
  const paths = specification.paths ?? {};
  const result = Object.fromEntries(
    Object.entries(targets).map(([key, pattern]) => [key, matchingOperations(paths, pattern)]),
  );

  console.log(JSON.stringify({
    source: basename(source),
    openapi: specification.openapi ?? null,
    hasServers: Array.isArray(specification.servers) && specification.servers.length > 0,
    hasSecuritySchemes: Boolean(specification.components?.securitySchemes),
    targets: result,
  }));
}
